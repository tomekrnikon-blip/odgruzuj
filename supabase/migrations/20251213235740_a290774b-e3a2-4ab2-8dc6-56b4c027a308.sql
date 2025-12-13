-- Add 'moderator' to app_role enum (must be committed first)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';