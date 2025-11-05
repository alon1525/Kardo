# SRS Migration Guide

This migration adds Spaced Repetition System (SRS) support to your flashcard app.

## Two Migration Options

### Option 1: `migration_srs.sql` (VARCHAR user_id)
- Use this if you have a custom `users` table with `VARCHAR(255)` user_id
- Matches your existing schema.sql structure

### Option 2: `migration_srs_uuid.sql` (UUID user_id)  
- Use this if you're using Supabase's built-in `auth.users` table (UUID type)
- This is the recommended version if you're using Supabase authentication

## What the Migration Does

1. **Creates a new `cards` table** with JSONB columns for `front` and `back` to preserve all formatting (align, fontSize, verticalAlign, etc.)

2. **Migrates existing cards** from the `decks.cards` JSONB array to the new `cards` table, preserving all formatting

3. **Creates `user_progress` table** for tracking SRS data per user per card:
   - `interval`: Days until next review
   - `ease_factor`: Difficulty multiplier (1.3 minimum)
   - `repetitions`: Number of successful reviews
   - `due_date`: When card should be reviewed next
   - `last_review`: Last review timestamp

4. **Sets up Row Level Security (RLS)** policies for both tables

## How to Run

1. **Choose the right migration file** based on your setup:
   - Custom users table → `migration_srs.sql`
   - Supabase auth.users → `migration_srs_uuid.sql`

2. **Run the migration** in your database:
   ```sql
   -- In Supabase SQL Editor or psql
   \i database/migration_srs_uuid.sql
   ```
   
   Or copy and paste the entire file content into your SQL editor.

## Important Notes

- **Card formatting is preserved**: All existing formatting (bold, alignment, fontSize) will be maintained
- **Backward compatible**: The server code handles both old JSONB format and new cards table
- **No data loss**: Existing cards are migrated automatically
- **RLS enabled**: Security policies are set up for Supabase

## After Migration

1. Restart your server
2. Test adding/editing cards - formatting should still work
3. Test Practice mode - it will now use SRS algorithm
4. Cards will be scheduled based on your review performance

## Troubleshooting

If you get a UUID/VARCHAR mismatch error:
- You're using Supabase auth.users → Use `migration_srs_uuid.sql`
- You have custom users table → Use `migration_srs.sql`

