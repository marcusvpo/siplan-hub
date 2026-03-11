-- Migration to remove hardcoded profiles_team_check constraint
-- Teams are now entirely dynamic and managed via the Teams configuration screen

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS "profiles_team_check";
