-- Migration: Add Learning Steps and User Settings Support
-- Run this after fix_interval_type.sql

-- Step 1: Add learning step tracking to user_progress
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS learning_step INTEGER DEFAULT 0;

COMMENT ON COLUMN user_progress.learning_step IS 'Current position in learning steps queue (0 = not started, -1 = graduated)';

-- Step 2: Create user_settings table for SRS configuration
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID NOT NULL PRIMARY KEY,
    max_interval INTEGER DEFAULT 36500 CHECK (max_interval <= 100000),
    starting_ease_factor FLOAT DEFAULT 2.5 CHECK (starting_ease_factor >= 1.1 AND starting_ease_factor <= 3.0),
    easy_bonus FLOAT DEFAULT 1.3 CHECK (easy_bonus >= 1.0 AND easy_bonus <= 2.0),
    interval_modifier FLOAT DEFAULT 1.0 CHECK (interval_modifier >= 0.5 AND interval_modifier <= 2.0),
    hard_interval_factor FLOAT DEFAULT 1.0 CHECK (hard_interval_factor >= 1.0 AND hard_interval_factor <= 2.0),
    new_cards_per_day INTEGER DEFAULT 20 CHECK (new_cards_per_day <= 200),
    learning_steps TEXT DEFAULT '1m,6m,10m,12d', -- Comma-separated learning steps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_settings IS 'User-specific SRS settings with safe limits';
COMMENT ON COLUMN user_settings.learning_steps IS 'Comma-separated learning steps (e.g., "1m,6m,10m,12d")';

-- Step 3: Enable RLS on user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and update their own settings
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 4: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

