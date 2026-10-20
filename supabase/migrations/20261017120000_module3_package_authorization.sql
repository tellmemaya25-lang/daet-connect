-- ============================================================================
-- Module 3 (Operator Package Management): authorization + data-integrity fixes
-- Status: DRAFT FOR REVIEW — NOT APPLIED. Review before running.
-- Scope approved by product owner: blockers + data integrity.
--
-- Findings this migration resolves (from read-only recon of the live database):
--   1. public.tours_package_stops has RLS enabled but ZERO policies, so every
--      authenticated read returns an empty set with no error. Operators can
--      save stops (the SECURITY DEFINER RPC bypasses RLS) but can never read
--      them back, and submit-for-review always fails with "Add at least one
--      map stop before submitting."
--   2. The "Operator manages own packages" and "Operator manages own package
--      pricing" policies are FOR ALL with an ownership check only: no draft
--      gate and no accreditation gate. An operator can self-publish a package
--      or edit the pricing of a published package directly via PostgREST,
--      bypassing admin review. The Server Action checks are application-layer.
--   3. public.profiles has no admin policy (only "view/update own profile"),
--      so admin pages that read profiles with the session client silently get
--      zero rows. This is the root cause of "Name unavailable" in the guide
--      review queue.
--   4. price_variant_check only requires one price to be non-null; it permits
--      negative prices, permits more than one default variant, and permits
--      max_pax < min_pax.
--
-- Run the PRE-FLIGHT CHECKS section first. Existing rows that violate the new
-- constraints will make this migration fail.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRE-FLIGHT CHECKS (read-only; run these BEFORE applying anything below)
-- ----------------------------------------------------------------------------
-- Negative prices:
--   select id, package_id, variant_name, price_per_pax, flat_price
--   from public.tours_package_price_variants
--   where (price_per_pax is not null and price_per_pax < 0)
--      or (flat_price is not null and flat_price < 0);
--
-- Packages with more than one default variant:
--   select package_id, count(*) as default_count
--   from public.tours_package_price_variants
--   where is_default
--   group by package_id
--   having count(*) <> 1;
--
-- Variants with max_pax below min_pax, or min_pax below 1:
--   select id, package_id, min_pax, max_pax
--   from public.tours_package_price_variants
--   where min_pax < 1 or (max_pax is not null and max_pax < min_pax);
--
-- Duplicate stop orders within one package:
--   select package_id, stop_order, count(*)
--   from public.tours_package_stops
--   group by package_id, stop_order
--   having count(*) > 1;
--
-- Orphaned stops/variants pointing at non-draft packages (informational):
--   select p.id, p.status, count(s.id) as stops, count(v.id) as variants
--   from public.tours_packages p
--   left join public.tours_package_stops s on s.package_id = p.id
--   left join public.tours_package_price_variants v on v.package_id = p.id
--   where p.status <> 'draft'
--   group by p.id, p.status;

begin;

-- ----------------------------------------------------------------------------
-- 1. tours_package_stops: add the missing policies
-- ----------------------------------------------------------------------------
-- Operators read their own stops at any package status (a published package's
-- itinerary must remain visible in the operator list/detail views).
create policy "Operator views own package stops"
  on public.tours_package_stops
  for select
  to authenticated
  using (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
    )
  );

-- Writes are limited to approved operators editing their own DRAFT packages,
-- mirroring the guard already enforced inside replace_package_stops().
create policy "Approved operator inserts own draft package stops"
  on public.tours_package_stops
  for insert
  to authenticated
  with check (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  );

create policy "Approved operator updates own draft package stops"
  on public.tours_package_stops
  for update
  to authenticated
  using (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  )
  with check (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  );

create policy "Approved operator deletes own draft package stops"
  on public.tours_package_stops
  for delete
  to authenticated
  using (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  );

-- Public itinerary for published packages, matching the existing
-- "Public views price variants of published packages" pattern.
create policy "Public views stops of published packages"
  on public.tours_package_stops
  for select
  to public
  using (
    package_id in (
      select p.id from public.tours_packages p
      where p.status = 'published'
    )
  );

-- Admins currently have no policy on this table at all.
create policy "Admin manages all package stops"
  on public.tours_package_stops
  for all
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 2. tours_packages: replace the unrestricted owner policy with gated policies
-- ----------------------------------------------------------------------------
drop policy if exists "Operator manages own packages" on public.tours_packages;

-- Owners may read their own packages at every status so the operator list can
-- show draft, pending_review, published, and archived entries.
create policy "Operator views own packages"
  on public.tours_packages
  for select
  to authenticated
  using (
    operator_id in (
      select o.id from public.tours_operators o where o.profile_id = auth.uid()
    )
  );

-- New packages must belong to an approved operator and must start as drafts.
create policy "Approved operator creates own draft packages"
  on public.tours_packages
  for insert
  to authenticated
  with check (
    status = 'draft'
    and operator_id in (
      select o.id from public.tours_operators o
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
    )
  );

-- Closes the self-publish hole: only a draft may be updated, and it may move
-- only to draft or pending_review. published/archived remain admin-only via
-- "Admin manages all packages".
create policy "Approved operator updates own draft packages"
  on public.tours_packages
  for update
  to authenticated
  using (
    status = 'draft'
    and operator_id in (
      select o.id from public.tours_operators o
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
    )
  )
  with check (
    status in ('draft', 'pending_review')
    and operator_id in (
      select o.id from public.tours_operators o
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
    )
  );

create policy "Approved operator deletes own draft packages"
  on public.tours_packages
  for delete
  to authenticated
  using (
    status = 'draft'
    and operator_id in (
      select o.id from public.tours_operators o
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. tours_package_price_variants: same draft/approval gating
-- ----------------------------------------------------------------------------
drop policy if exists "Operator manages own package pricing"
  on public.tours_package_price_variants;

create policy "Operator views own package pricing"
  on public.tours_package_price_variants
  for select
  to authenticated
  using (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
    )
  );

create policy "Approved operator inserts own draft package pricing"
  on public.tours_package_price_variants
  for insert
  to authenticated
  with check (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  );

create policy "Approved operator updates own draft package pricing"
  on public.tours_package_price_variants
  for update
  to authenticated
  using (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  )
  with check (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  );

create policy "Approved operator deletes own draft package pricing"
  on public.tours_package_price_variants
  for delete
  to authenticated
  using (
    package_id in (
      select p.id
      from public.tours_packages p
      join public.tours_operators o on o.id = p.operator_id
      where o.profile_id = auth.uid()
        and o.accreditation_status = 'approved'
        and p.status = 'draft'
    )
  );

-- ----------------------------------------------------------------------------
-- 4. profiles: let admins resolve applicant names
-- ----------------------------------------------------------------------------
-- Fixes "Name unavailable" in /tours/admin/guides, which reads profiles.id and
-- profiles.full_name through the authenticated session client. SELECT only,
-- so admins still cannot modify other users' profiles.
create policy "Admin views all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 5. Data integrity: constraints and indexes
-- ----------------------------------------------------------------------------
alter table public.tours_package_price_variants
  add constraint price_variant_nonnegative_check
    check (
      (price_per_pax is null or price_per_pax >= 0)
      and (flat_price is null or flat_price >= 0)
    );

alter table public.tours_package_price_variants
  add constraint price_variant_pax_range_check
    check (min_pax >= 1 and (max_pax is null or max_pax >= min_pax));

-- Enforces the "exactly one default variant" rule the app currently checks in
-- application code only. A partial unique index allows at most one default per
-- package; the RPC below also rejects zero defaults.
create unique index if not exists tours_package_price_variants_one_default_idx
  on public.tours_package_price_variants (package_id)
  where is_default;

-- stop_order is generated by replace_package_stops() via WITH ORDINALITY, so a
-- unique index makes ordering violations impossible at the storage layer.
create unique index if not exists tours_package_stops_order_unique_idx
  on public.tours_package_stops (package_id, stop_order);

-- ----------------------------------------------------------------------------
-- 6. RPCs: add the approved-operator gate, reject malformed input, and make
--    submit-for-review atomic with its completeness checks
-- ----------------------------------------------------------------------------
create or replace function public.replace_package_price_variants(
  p_package_id uuid,
  p_variants jsonb
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  -- Defense in depth: this function bypasses RLS, so it re-checks ownership,
  -- approval, and draft status rather than trusting the caller.
  if not exists (
    select 1
    from tours_packages p
    join tours_operators o on o.id = p.operator_id
    where p.id = p_package_id
      and o.profile_id = auth.uid()
      and o.accreditation_status = 'approved'
      and p.status = 'draft'
  ) then
    raise exception 'Not authorized to modify this package, or package is not in draft status.';
  end if;

  if coalesce(jsonb_typeof(p_variants), 'null') <> 'array' then
    raise exception 'Price variants must be provided as an array.';
  end if;

  if (
    select count(*) filter (where coalesce((v ->> 'isDefault')::boolean, false))
    from jsonb_array_elements(p_variants) as v
  ) <> 1 then
    raise exception 'Exactly one price variant must be marked as default.';
  end if;

  delete from tours_package_price_variants where package_id = p_package_id;

  insert into tours_package_price_variants (
    package_id, variant_name, min_pax, max_pax, price_per_pax, flat_price, is_default
  )
  select
    p_package_id,
    nullif(btrim(coalesce(v ->> 'variantName', '')), ''),
    (v ->> 'minPax')::int,
    nullif(v ->> 'maxPax', '')::int,
    nullif(v ->> 'pricePerPax', '')::numeric,
    nullif(v ->> 'flatPrice', '')::numeric,
    -- coalesce prevents a NOT NULL violation when the key is absent.
    coalesce((v ->> 'isDefault')::boolean, false)
  from jsonb_array_elements(p_variants) as v;
end;
$function$;

create or replace function public.replace_package_stops(
  p_package_id uuid,
  p_stops jsonb
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if not exists (
    select 1
    from tours_packages p
    join tours_operators o on o.id = p.operator_id
    where p.id = p_package_id
      and o.profile_id = auth.uid()
      and o.accreditation_status = 'approved'
      and p.status = 'draft'
  ) then
    raise exception 'Not authorized to modify this package, or package is not in draft status.';
  end if;

  if coalesce(jsonb_typeof(p_stops), 'null') <> 'array' then
    raise exception 'Map stops must be provided as an array.';
  end if;

  delete from tours_package_stops where package_id = p_package_id;

  insert into tours_package_stops (
    package_id, stop_order, location_name, latitude, longitude,
    description, estimated_duration_minutes
  )
  select
    p_package_id,
    t.ordinality::int,
    nullif(btrim(coalesce(t.v ->> 'locationName', '')), ''),
    (t.v ->> 'latitude')::numeric,
    (t.v ->> 'longitude')::numeric,
    nullif(t.v ->> 'description', '')::text,
    nullif(t.v ->> 'estimatedDurationMinutes', '')::int
  from jsonb_array_elements(p_stops) with ordinality as t(v, ordinality)
  order by t.ordinality;
end;
$function$;

-- NEW: validates completeness and performs the draft -> pending_review
-- transition inside one transaction, removing the race between the
-- application-layer checks and the separate status update.
create or replace function public.submit_package_for_review(p_package_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_variant_count int;
  v_default_count int;
  v_stop_count int;
begin
  if not exists (
    select 1
    from tours_packages p
    join tours_operators o on o.id = p.operator_id
    where p.id = p_package_id
      and o.profile_id = auth.uid()
      and o.accreditation_status = 'approved'
      and p.status = 'draft'
  ) then
    raise exception 'Not authorized to submit this package, or package is not in draft status.';
  end if;

  select count(*), count(*) filter (where is_default)
    into v_variant_count, v_default_count
  from tours_package_price_variants
  where package_id = p_package_id;

  if v_variant_count = 0 then
    raise exception 'Add at least one price variant before submitting.';
  end if;
  if v_default_count <> 1 then
    raise exception 'Set exactly one price variant as the default before submitting.';
  end if;

  select count(*) into v_stop_count
  from tours_package_stops
  where package_id = p_package_id;

  if v_stop_count = 0 then
    raise exception 'Add at least one map stop before submitting.';
  end if;

  update tours_packages
     set status = 'pending_review',
         updated_at = now()
   where id = p_package_id
     and status = 'draft';
end;
$function$;

-- The functions re-check auth.uid() and ownership, so PUBLIC/anon do not need
-- execute rights. Granting to authenticated plus service_role only.
revoke execute on function public.replace_package_price_variants(uuid, jsonb) from public;
revoke execute on function public.replace_package_price_variants(uuid, jsonb) from anon;
revoke execute on function public.replace_package_stops(uuid, jsonb) from public;
revoke execute on function public.replace_package_stops(uuid, jsonb) from anon;
revoke execute on function public.submit_package_for_review(uuid) from public;
revoke execute on function public.submit_package_for_review(uuid) from anon;

grant execute on function public.replace_package_price_variants(uuid, jsonb) to authenticated, service_role;
grant execute on function public.replace_package_stops(uuid, jsonb) to authenticated, service_role;
grant execute on function public.submit_package_for_review(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. OPTIONAL: keep tours_packages.updated_at current
-- ----------------------------------------------------------------------------
-- The operator package list orders by updated_at descending. If no trigger
-- maintains that column it only ever equals created_at, so recently edited
-- packages never rise to the top. Check first:
--   select tgname from pg_trigger
--   where tgrelid = 'public.tours_packages'::regclass and not tgisinternal;
-- If nothing is returned, this block adds one; if a trigger already exists it
-- does nothing.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

do $do$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.tours_packages'::regclass
      and tgname = 'tours_packages_set_updated_at'
      and not tgisinternal
  ) then
    create trigger tours_packages_set_updated_at
      before update on public.tours_packages
      for each row execute function public.set_updated_at();
  end if;
end;
$do$;

commit;

-- ============================================================================
-- POST-APPLY VERIFICATION (read-only)
-- ============================================================================
-- Policies now present on the package tables:
--   select tablename, policyname, cmd, roles from pg_policies
--   where schemaname = 'public'
--     and tablename in ('profiles','tours_packages',
--                       'tours_package_price_variants','tours_package_stops')
--   order by tablename, policyname;
--
-- Then, as a signed-in approved operator in the browser:
--   * open /tours/operator/packages and confirm saved stops and variants render
--   * submit a complete draft package and confirm it becomes pending_review
--   * attempt PATCH status=published directly against PostgREST and confirm RLS
--     rejects it
-- ============================================================================
