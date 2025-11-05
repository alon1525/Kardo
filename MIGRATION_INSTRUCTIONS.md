# Database Migration Required

## Error: `column up.learning_step does not exist`

You need to run the database migration to add the `learning_step` column and `user_settings` table.

## Quick Fix

Run this SQL script in your Supabase SQL Editor:

**File**: `database/run_migration_learning_steps.sql`

Or copy and paste this directly:

```sql
-- Add learning_step column
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS learning_step INTEGER DEFAULT 0;

-- Create user_settings table
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

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;

CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Trigger function
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();
```

## Steps

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Paste the SQL above (or open `database/run_migration_learning_steps.sql`)
4. Click "Run"
5. Refresh your application

## After Migration

The learning steps system will work automatically:
- New cards start at `learning_step = 0`
- Cards progress through the queue: [1m, 6m, 10m, 12d]
- Review cards use SM-2 formula with user settings

## Verify Migration

Run this query to verify:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
AND column_name = 'learning_step';
```

You should see `learning_step` with type `integer`.

