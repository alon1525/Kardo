-- Complete rebuild - run this in Supabase SQL Editor

-- Drop everything
DROP TABLE IF EXISTS study_progress CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS popular_decks CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS decks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table - user_id is UUID (matches Supabase Auth)
CREATE TABLE users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cards_studied_today INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);

-- Decks table - stores cards as JSONB
CREATE TABLE decks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(100) NOT NULL DEFAULT 'English',
    cards JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_decks_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_language ON decks(language);
CREATE INDEX idx_decks_is_public ON decks(is_public);
CREATE INDEX idx_decks_download_count ON decks(download_count DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own decks" ON decks;
DROP POLICY IF EXISTS "Anyone can view public decks" ON decks;
DROP POLICY IF EXISTS "Users can create their own decks" ON decks;
DROP POLICY IF EXISTS "Users can update their own decks" ON decks;
DROP POLICY IF EXISTS "Users can delete their own decks" ON decks;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for decks
CREATE POLICY "Users can view their own decks" ON decks
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone can view public decks" ON decks
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can create their own decks" ON decks
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own decks" ON decks
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own decks" ON decks
    FOR DELETE USING (user_id = auth.uid());

SELECT 'Database rebuilt successfully!' AS message;
