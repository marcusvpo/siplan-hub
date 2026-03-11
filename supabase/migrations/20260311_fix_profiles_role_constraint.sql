-- Fix 1: Remove the CHECK CONSTRAINT that only allows 'admin' or 'user' as role values
-- This allows custom roles created in app_roles to be assigned to users in profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Fix 2: Add team column if it doesn't exist (some environments may be missing it)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team text;

-- Fix 3: Replace the RLS UPDATE policy to also allow admins to update any profile
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Allow users to update their own profile, and admins to update any profile
CREATE POLICY "Users can update own profile or admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
