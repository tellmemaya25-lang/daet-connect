'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePackageStatus(formData: FormData) {
  const packageId = formData.get('packageId') as string;
  const status = formData.get('status') as string;
  const notes = formData.get('notes') as string;

  if (!packageId || !status) {
    return { success: false, error: 'Missing required fields' };
  }

  const supabase = await createSupabaseServerClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Unauthorized' };
  }

  // Update package status
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  // If rejecting, add rejection reason
  if (status === 'rejected' && notes) {
    updateData.rejection_reason = notes;
  }

  // If publishing, clear rejection reason
  if (status === 'published') {
    updateData.rejection_reason = null;
  }

  const { error } = await supabase
    .from('tours_packages')
    .update(updateData)
    .eq('id', packageId);

  if (error) {
    console.error('Error updating package status:', error);
    return { success: false, error: error.message };
  }

  // Create audit log entry (optional - won't fail if table doesn't exist)
  try {
    await supabase.from('tours_admin_audit_log').insert({
      admin_id: user.id,
      action: 'update_package_status',
      entity_type: 'package',
      entity_id: packageId,
      old_value: null, // Could fetch old status if needed
      new_value: status,
      notes: notes || null,
    });
  } catch (auditError) {
    console.error('Audit log failed (non-critical):', auditError);
    // Don't fail the whole operation if audit logging fails
  }

  revalidatePath('/tours/admin/packages');
  revalidatePath(`/tours/admin/packages/${packageId}`);

  return { success: true };
}
