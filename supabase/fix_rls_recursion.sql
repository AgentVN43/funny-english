-- Fix: infinite recursion in RLS policies on profiles table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard > SQL Editor)

-- Step 1: Create a SECURITY DEFINER function to check admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Step 2: Fix profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

-- Step 3: Fix categories policies
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (public.is_admin());

-- Step 4: Fix cards policies
DROP POLICY IF EXISTS "Admins can insert cards" ON cards;
CREATE POLICY "Admins can insert cards"
  ON cards FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update cards" ON cards;
CREATE POLICY "Admins can update cards"
  ON cards FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete cards" ON cards;
CREATE POLICY "Admins can delete cards"
  ON cards FOR DELETE
  USING (public.is_admin());

-- Step 5: Fix user_settings policies
DROP POLICY IF EXISTS "Admins can view all settings" ON user_settings;
CREATE POLICY "Admins can view all settings"
  ON user_settings FOR SELECT
  USING (public.is_admin());

-- Step 6: Fix progress policies
DROP POLICY IF EXISTS "Admins can view all progress" ON progress;
CREATE POLICY "Admins can view all progress"
  ON progress FOR SELECT
  USING (public.is_admin());
