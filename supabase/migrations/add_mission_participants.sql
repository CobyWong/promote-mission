-- Add participant-gated mission support
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS min_participants integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_participants integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.missions.min_participants IS
  'Minimum creator count needed before this mission opens (0 = always open).';

COMMENT ON COLUMN public.missions.current_participants IS
  'Current registered creator count for gated opening.';
