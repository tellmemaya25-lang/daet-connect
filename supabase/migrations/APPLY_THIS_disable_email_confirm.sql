-- =====================================================
-- DISABLE EMAIL CONFIRMATION REQUIREMENT
-- This allows users to login immediately after signup
-- =====================================================

-- Step 1: Auto-confirm ALL existing unconfirmed users
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmation_token = NULL
WHERE email_confirmed_at IS NULL;

-- Step 2: Note about Supabase Dashboard setting
-- You still need to disable email confirmation in Supabase Dashboard:
-- 1. Go to Authentication → Providers
-- 2. Click on "Email" provider
-- 3. Toggle OFF "Confirm email" or "Enable email confirmations"
-- 4. Save changes
--
-- After that, new signups will NOT require email confirmation

-- Verify all users are confirmed
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
ORDER BY created_at DESC;
