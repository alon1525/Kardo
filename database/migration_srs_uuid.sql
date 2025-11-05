-- Migration to Spaced Repetition System (SRS) - UUID Version for Supabase auth.users
-- Use this if you're using Supabase's built-in auth.users table (UUID type)
-- This migration preserves all existing card formatting (align, fontSize, etc.)

-- Step 1: Create new cards table with proper structure for formatted content
CREATE TABLE IF NOT EXISTS cards_new (
    id SERIAL PRIMARY KEY,
    deck_id INTEGER NOT NULL,
    front JSONB NOT NULL,  -- Stores { content, align, verticalAlign, fontSize }
    back JSONB NOT NULL,  -- Stores { content, align, verticalAlign, fontSize }
    hint TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cards_deck FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_new_deck_id ON cards_new(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_new_difficulty ON cards_new(difficulty);

-- Step 2: Migrate existing cards from decks.cards JSONB to cards_new table
DO $$
DECLARE
    deck_record RECORD;
    card_record JSONB;
    card_counter INTEGER;
BEGIN
    -- Loop through all decks that have cards
    FOR deck_record IN SELECT id, cards FROM decks WHERE cards IS NOT NULL AND jsonb_array_length(cards) > 0
    LOOP
        card_counter := 0;
        -- Loop through each card in the deck's cards array
        FOR card_record IN SELECT * FROM jsonb_array_elements(deck_record.cards)
        LOOP
            -- Insert card into new table, preserving all formatting
            INSERT INTO cards_new (deck_id, front, back, difficulty, created_at, updated_at)
            VALUES (
                deck_record.id,
                -- Ensure front is always a JSONB object with proper structure
                CASE 
                    WHEN jsonb_typeof(card_record->'front') = 'object' THEN card_record->'front'
                    ELSE jsonb_build_object(
                        'content', COALESCE(card_record->>'front', ''),
                        'align', 'center',
                        'verticalAlign', 'middle',
                        'fontSize', '18'
                    )
                END,
                -- Ensure back is always a JSONB object with proper structure
                CASE 
                    WHEN jsonb_typeof(card_record->'back') = 'object' THEN card_record->'back'
                    ELSE jsonb_build_object(
                        'content', COALESCE(card_record->>'back', ''),
                        'align', 'center',
                        'verticalAlign', 'middle',
                        'fontSize', '18'
                    )
                END,
                COALESCE(card_record->>'difficulty', 'medium'),
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            card_counter := card_counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Migrated % cards from deck %', card_counter, deck_record.id;
    END LOOP;
END $$;

-- Step 3: Create user_progress table for SRS (UUID version for Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID NOT NULL,  -- UUID for Supabase auth.users
    card_id INTEGER NOT NULL,
    interval INTEGER DEFAULT 0,  -- Days until next review
    ease_factor FLOAT DEFAULT 2.5,  -- Difficulty multiplier (minimum 1.3)
    repetitions INTEGER DEFAULT 0,  -- Number of successful reviews
    due_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When card should be reviewed next
    last_review TIMESTAMP,  -- Last time card was reviewed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, card_id),
    CONSTRAINT fk_user_progress_card FOREIGN KEY (card_id) REFERENCES cards_new(id) ON DELETE CASCADE
    -- Note: No foreign key to auth.users - Supabase handles this via RLS
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_due_date ON user_progress(due_date);
CREATE INDEX IF NOT EXISTS idx_user_progress_card_id ON user_progress(card_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_due ON user_progress(user_id, due_date);

-- Step 4: Enable RLS on new tables
ALTER TABLE cards_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cards_new
-- Cast both sides to text to handle UUID or VARCHAR user_id in decks table
CREATE POLICY "Users can view cards in their decks" ON cards_new
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards_new.deck_id 
            AND decks.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Anyone can view cards in public decks" ON cards_new
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards_new.deck_id AND decks.is_public = true
        )
    );

CREATE POLICY "Users can create cards in their decks" ON cards_new
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards_new.deck_id 
            AND decks.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can update cards in their decks" ON cards_new
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards_new.deck_id 
            AND decks.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete cards in their decks" ON cards_new
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards_new.deck_id 
            AND decks.user_id::text = auth.uid()::text
        )
    );

-- RLS Policies for user_progress (UUID version)
CREATE POLICY "Users can view their own progress" ON user_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own progress" ON user_progress
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress" ON user_progress
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own progress" ON user_progress
    FOR DELETE USING (user_id = auth.uid());

-- Step 5: Rename old cards table (if exists) and new one to cards
DO $$
BEGIN
    -- Drop old cards table if it exists (from schema.sql)
    DROP TABLE IF EXISTS cards CASCADE;
    
    -- Rename cards_new to cards
    ALTER TABLE cards_new RENAME TO cards;
    ALTER INDEX idx_cards_new_deck_id RENAME TO idx_cards_deck_id;
    ALTER INDEX idx_cards_new_difficulty RENAME TO idx_cards_difficulty;
    ALTER SEQUENCE cards_new_id_seq RENAME TO cards_id_seq;
    
    -- Update foreign key constraint name
    ALTER TABLE cards DROP CONSTRAINT IF EXISTS fk_cards_deck;
    ALTER TABLE cards ADD CONSTRAINT fk_cards_deck FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE;
    
    ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS fk_user_progress_card;
    ALTER TABLE user_progress ADD CONSTRAINT fk_user_progress_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE;
END $$;

-- Step 6: Add card_count column if it doesn't exist, then update it
DO $$
BEGIN
    -- Add card_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'decks' AND column_name = 'card_count'
    ) THEN
        ALTER TABLE decks ADD COLUMN card_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update card_count in decks based on actual cards
UPDATE decks 
SET card_count = (
    SELECT COUNT(*) 
    FROM cards 
    WHERE cards.deck_id = decks.id
);

-- Step 7: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'SRS migration completed successfully! Cards table created and user_progress table ready (UUID version).' AS message;

