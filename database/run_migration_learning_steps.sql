-- Quick Migration Script: Add Learning Steps Support
-- Run this in your Supabase SQL Editor or PostgreSQL client

-- Step 1: Add learning_step column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_progress' 
        AND column_name = 'learning_step'
    ) THEN
        ALTER TABLE user_progress 
        ADD COLUMN learning_step INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN user_progress.learning_step IS 'Current position in learning steps queue (0 = not started, -1 = graduated)';
        
        RAISE NOTICE 'Added learning_step column to user_progress';
    ELSE
        RAISE NOTICE 'learning_step column already exists';
    END IF;
END $$;

-- Step 2: Create user_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID NOT NULL PRIMARY KEY,
    max_interval INTEGER DEFAULT 36500 CHECK (max_interval <= 100000),
    starting_ease_factor FLOAT DEFAULT 2.5 CHECK (starting_ease_factor >= 1.1 AND starting_ease_factor <= 3.0),
    easy_bonus FLOAT DEFAULT 1.3 CHECK (easy_bonus >= 1.0 AND easy_bonus <= 2.0),
    interval_modifier FLOAT DEFAULT 1.0 CHECK (interval_modifier >= 0.5 AND interval_modifier <= 2.0),
    hard_interval_factor FLOAT DEFAULT 1.0 CHECK (hard_interval_factor >= 1.0 AND hard_interval_factor <= 2.0),
    new_cards_per_day INTEGER DEFAULT 20 CHECK (new_cards_per_day <= 200),
    learning_steps TEXT DEFAULT '1m,6m,10m,12d',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_settings IS 'User-specific SRS settings with safe limits';
COMMENT ON COLUMN user_settings.learning_steps IS 'Comma-separated learning steps (e.g., "1m,6m,10m,12d")';

-- Step 3: Enable RLS on user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Step 6: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

-- Step 8: Create trigger
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'learning_step column added to user_progress';
    RAISE NOTICE 'user_settings table created (if it did not exist)';
END $$;

