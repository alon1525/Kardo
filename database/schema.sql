-- Kardo Language Learning Flashcard Database Schema
-- PostgreSQL version for Supabase

-- Users table (simplified)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cards_studied_today INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(100) NOT NULL DEFAULT 'English',
    card_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_decks_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_language ON decks(language);
CREATE INDEX IF NOT EXISTS idx_decks_is_public ON decks(is_public);
CREATE INDEX IF NOT EXISTS idx_decks_download_count ON decks(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_decks_created_at ON decks(created_at);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    deck_id INTEGER NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cards_deck FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_difficulty ON cards(difficulty);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- RLS Policies for decks table
CREATE POLICY "Users can view their own decks" ON decks
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Anyone can view public decks" ON decks
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create their own decks" ON decks
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own decks" ON decks
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own decks" ON decks
    FOR DELETE USING (user_id = auth.uid()::text);

-- RLS Policies for cards table
CREATE POLICY "Users can view cards in their decks" ON cards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Anyone can view cards in public decks" ON cards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards.deck_id AND decks.is_public = true
        )
    );

CREATE POLICY "Users can create cards in their decks" ON cards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update cards in their decks" ON cards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete cards in their decks" ON cards
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM decks 
            WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()::text
        )
    );

-- Sample data (optional - can be removed)
-- Insert sample user
INSERT INTO users (user_id, email) 
VALUES ('demo_user_1', 'demo@example.com')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample public decks
INSERT INTO decks (user_id, name, description, language, card_count, is_public, download_count)
VALUES 
    ('demo_user_1', 'Spanish Basics', 'Essential Spanish words and phrases', 'Spanish', 3, true, 15),
    ('demo_user_1', 'French Essentials', 'Common French vocabulary', 'French', 2, true, 8),
    ('demo_user_1', 'German Fundamentals', 'Basic German words', 'German', 4, false, 0)
ON CONFLICT DO NOTHING;

-- Insert sample cards for Spanish deck
INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Hello', 'Hola', 'easy'
FROM decks d WHERE d.name = 'Spanish Basics' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Thank you', 'Gracias', 'easy'
FROM decks d WHERE d.name = 'Spanish Basics' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Good morning', 'Buenos días', 'medium'
FROM decks d WHERE d.name = 'Spanish Basics' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample cards for French deck
INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Hello', 'Bonjour', 'easy'
FROM decks d WHERE d.name = 'French Essentials' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Thank you', 'Merci', 'easy'
FROM decks d WHERE d.name = 'French Essentials' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample cards for German deck
INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Hello', 'Hallo', 'easy'
FROM decks d WHERE d.name = 'German Fundamentals' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Thank you', 'Danke', 'easy'
FROM decks d WHERE d.name = 'German Fundamentals' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Good morning', 'Guten Morgen', 'medium'
FROM decks d WHERE d.name = 'German Fundamentals' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cards (deck_id, front, back, difficulty)
SELECT d.id, 'Goodbye', 'Auf Wiedersehen', 'medium'
FROM decks d WHERE d.name = 'German Fundamentals' AND d.user_id = 'demo_user_1'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Display success message
SELECT 'Database schema created successfully!' AS message;
