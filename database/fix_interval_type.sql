-- Fix interval column type to support fractional intervals (for learning steps)
-- Run this in your Supabase SQL Editor

-- Change interval from INTEGER to NUMERIC to support fractional days (minutes/hours)
ALTER TABLE user_progress 
ALTER COLUMN interval TYPE NUMERIC(10, 6) USING interval::NUMERIC(10, 6);

-- Update comment
COMMENT ON COLUMN user_progress.interval IS 'Days until next review (supports fractional days for learning steps like 1 minute = 0.000694 days)';

