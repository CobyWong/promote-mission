-- Add minimum participant gate to missions
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS min_participants integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_participants integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.missions.min_participants IS
  'Minimum number of registered creators before the mission opens (0 = no gate, always open)';

COMMENT ON COLUMN public.missions.current_participants IS
  'Number of creators who have registered interest for this mission';
