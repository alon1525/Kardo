import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { getAISuggestions, getCardExplanation } from './ai-service.js';
import { reviewCard } from './srs-algorithm.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : false
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to PostgreSQL database (Supabase)');
  release();
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Get all decks for a user
app.get('/api/decks/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  console.log('GET /api/decks/:userId - userId:', userId);
  
  try {
    // Try to find decks by user_id
    let result = await pool.query(
      'SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    console.log(`Found ${result.rows.length} decks for user_id: ${userId}`);
    
    // If no decks found, try by email (if userId is an email)
    if (result.rows.length === 0 && userId.includes('@')) {
      console.log('No decks found by user_id, trying email:', userId);
      const userResult = await pool.query(
        'SELECT user_id FROM users WHERE email = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        const actualUserId = userResult.rows[0].user_id;
        console.log('Found user by email, user_id:', actualUserId);
        result = await pool.query(
          'SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC',
          [actualUserId]
        );
        console.log(`Found ${result.rows.length} decks for user_id: ${actualUserId}`);
      }
    }
    
    // Also check all decks to see what user_ids exist
    if (result.rows.length === 0) {
      const allDecks = await pool.query('SELECT user_id, name FROM decks LIMIT 10');
      console.log('Sample decks in database (first 10):', allDecks.rows.map(d => ({ user_id: d.user_id, name: d.name })));
    }
    
    // Parse cards JSON from each deck
    const decks = result.rows.map(deck => ({
      ...deck,
      cards: deck.cards || []
    }));
    
    res.json(decks);
  } catch (err) {
    console.error('Error fetching decks:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to ensure user exists
const ensureUserExists = async (userId, email = null) => {
  try {
    const userCheck = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      // Create user if doesn't exist (for Firebase Auth or other auth providers)
      await pool.query(
        'INSERT INTO users (user_id, email) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
        [userId, email || `${userId}@example.com`]
      );
    }
  } catch (err) {
    console.error('Error ensuring user exists:', err);
    // Don't throw - let the calling function handle it
  }
};

// Create a new deck
app.post('/api/decks', async (req, res) => {
  const { userId, name, description, language } = req.body;
  
  try {
    // Ensure user exists in database
    await ensureUserExists(userId, req.body.email);
    
    const result = await pool.query(
      'INSERT INTO decks (user_id, name, description, language, cards) VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING id',
      [userId, name, description, language, JSON.stringify([])]
    );
    res.json({ id: result.rows[0].id, ...req.body, cards: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a deck
app.put('/api/decks/:id', async (req, res) => {
  const { name, description, language } = req.body;
  const deckId = req.params.id;
  
  try {
    await pool.query(
      'UPDATE decks SET name = $1, description = $2, language = $3 WHERE id = $4',
      [name, description, language, deckId]
    );
    res.json({ message: 'Deck updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a deck
app.delete('/api/decks/:id', async (req, res) => {
  const deckId = req.params.id;
  
  try {
    await pool.query('DELETE FROM decks WHERE id = $1', [deckId]);
    res.json({ message: 'Deck deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get cards for a deck (using new cards table, with fallback to old JSONB)
app.get('/api/decks/:deckId/cards', async (req, res) => {
  const deckId = req.params.deckId;
  
  try {
    // Try to get cards from new cards table first
    const cardsResult = await pool.query(
      'SELECT id, front, back, difficulty, created_at, updated_at FROM cards WHERE deck_id = $1 ORDER BY id',
      [deckId]
    );
    
    if (cardsResult.rows.length > 0) {
      // Return cards from new table
      const cards = cardsResult.rows.map(row => ({
        id: row.id,
        front: typeof row.front === 'string' ? JSON.parse(row.front) : row.front,
        back: typeof row.back === 'string' ? JSON.parse(row.back) : row.back,
        difficulty: row.difficulty,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
      return res.json(cards);
    }
    
    // Fallback to old JSONB structure (for backward compatibility during migration)
    const deckResult = await pool.query(
      'SELECT cards FROM decks WHERE id = $1',
      [deckId]
    );
    const cards = deckResult.rows[0]?.cards || [];
    res.json(cards);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a card to a deck (using new cards table, preserving all formatting)
app.post('/api/decks/:deckId/cards', async (req, res) => {
  const deckId = req.params.deckId;
  const { front, back, frontAlign, backAlign, frontVerticalAlign, backVerticalAlign, frontFontSize, backFontSize, difficulty } = req.body;
  
  try {
    // Build front and back JSONB objects with all formatting
    const frontObj = {
      content: front || '',
      align: frontAlign || 'center',
      verticalAlign: frontVerticalAlign || 'middle',
      fontSize: frontFontSize || '18'
    };
    
    const backObj = {
      content: back || '',
      align: backAlign || 'center',
      verticalAlign: backVerticalAlign || 'middle',
      fontSize: backFontSize || '18'
    };
    
    // Insert into new cards table
    const result = await pool.query(
      `INSERT INTO cards (deck_id, front, back, difficulty) 
       VALUES ($1, $2::jsonb, $3::jsonb, $4) 
       RETURNING id, front, back, difficulty, created_at, updated_at`,
      [deckId, JSON.stringify(frontObj), JSON.stringify(backObj), difficulty || 'medium']
    );
    
    const newCard = {
      id: result.rows[0].id,
      front: result.rows[0].front,
      back: result.rows[0].back,
      difficulty: result.rows[0].difficulty,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    };
    
    // Update deck card_count
    await pool.query(
      'UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = $1) WHERE id = $1',
      [deckId]
    );
    
    res.json(newCard);
  } catch (err) {
    console.error('Error adding card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a card (preserving formatting)
app.put('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  const { front, back, frontAlign, backAlign, frontVerticalAlign, backVerticalAlign, frontFontSize, backFontSize, difficulty, deckId } = req.body;
  
  try {
    // Get existing card to preserve formatting if not provided
    const existingResult = await pool.query('SELECT front, back FROM cards WHERE id = $1', [cardId]);
    
    let frontObj, backObj;
    
    if (existingResult.rows.length > 0) {
      // Preserve existing formatting, update with new values
      const existingFront = existingResult.rows[0].front;
      const existingBack = existingResult.rows[0].back;
      
      frontObj = {
        content: front || existingFront?.content || '',
        align: frontAlign || existingFront?.align || 'center',
        verticalAlign: frontVerticalAlign || existingFront?.verticalAlign || 'middle',
        fontSize: frontFontSize || existingFront?.fontSize || '18'
      };
      
      backObj = {
        content: back || existingBack?.content || '',
        align: backAlign || existingBack?.align || 'center',
        verticalAlign: backVerticalAlign || existingBack?.verticalAlign || 'middle',
        fontSize: backFontSize || existingBack?.fontSize || '18'
      };
    } else {
      // New card structure
      frontObj = {
        content: front || '',
        align: frontAlign || 'center',
        verticalAlign: frontVerticalAlign || 'middle',
        fontSize: frontFontSize || '18'
      };
      
      backObj = {
        content: back || '',
        align: backAlign || 'center',
        verticalAlign: backVerticalAlign || 'middle',
        fontSize: backFontSize || '18'
      };
    }
    
    // Update card in new table
    await pool.query(
      `UPDATE cards 
       SET front = $1::jsonb, back = $2::jsonb, difficulty = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [JSON.stringify(frontObj), JSON.stringify(backObj), difficulty || 'medium', cardId]
    );
    
    res.json({ message: 'Card updated successfully' });
  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a card
app.delete('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  const { deckId } = req.query;
  
  try {
    // Delete from new cards table
    const result = await pool.query('DELETE FROM cards WHERE id = $1 RETURNING deck_id', [cardId]);
    
    if (result.rows.length > 0) {
      const deletedDeckId = result.rows[0].deck_id;
      
      // Update deck card_count
      await pool.query(
        'UPDATE decks SET card_count = (SELECT COUNT(*) FROM cards WHERE deck_id = $1) WHERE id = $1',
        [deletedDeckId]
      );
    }
    
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    console.error('Error deleting card:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== SRS (Spaced Repetition System) Endpoints ====================

// Get due cards for a user in a deck (cards that need to be reviewed)
app.get('/api/decks/:deckId/due-cards', async (req, res) => {
  const deckId = req.params.deckId;
  const userId = req.query.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // First, check if there are any cards in the deck at all (new table)
    const cardCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM cards WHERE deck_id = $1',
      [deckId]
    );
    const totalCards = parseInt(cardCountResult.rows[0]?.count || 0);
    console.log(`Total cards in deck ${deckId} (new table): ${totalCards}`);
    
    // Also check old format
    const oldCardsResult = await pool.query(
      'SELECT cards FROM decks WHERE id = $1',
      [deckId]
    );
    const oldCards = oldCardsResult.rows[0]?.cards || [];
    const oldCardsCount = Array.isArray(oldCards) ? oldCards.length : 0;
    console.log(`Cards in deck ${deckId} (old JSONB format): ${oldCardsCount}`);
    
    // If no cards in new table but cards exist in old format, return empty array
    // (user needs to run migration first)
    if (totalCards === 0 && oldCardsCount > 0) {
      console.warn(`Deck ${deckId} has cards in old format but not migrated to new cards table yet`);
      return res.json([]);
    }
    
    if (totalCards === 0) {
      console.log(`No cards found in deck ${deckId}`);
      return res.json([]);
    }
    
    // Get cards in priority order: Due (red) → Learning (green) → New (blue)
    // Priority 0: Due cards (due_date <= now()) - includes both review cards and learning cards that are due
    // Priority 1: Learning cards (interval < 1 day, has been reviewed, not due yet)
    // Priority 2: New cards (no user_progress OR never reviewed)
    const result = await pool.query(
      `SELECT 
        c.id,
        c.deck_id,
        c.front,
        c.back,
        c.difficulty,
        c.hint,
        COALESCE(up.interval::FLOAT, 0) as interval,
        COALESCE(up.ease_factor, 2.5) as ease_factor,
        COALESCE(up.repetitions, 0) as repetitions,
        COALESCE(up.due_date, CURRENT_TIMESTAMP) as due_date,
        up.last_review,
        CASE 
          WHEN up.user_id IS NULL THEN true 
          WHEN up.repetitions = 0 AND up.last_review IS NULL THEN true
          ELSE false 
        END as is_new,
        CASE 
          WHEN up.user_id IS NULL THEN 2  -- New cards (priority 2)
          WHEN up.repetitions = 0 AND up.last_review IS NULL THEN 2  -- New cards (never reviewed)
          WHEN up.due_date <= CURRENT_TIMESTAMP THEN 0  -- Due cards (priority 0) - includes learning cards that are due
          WHEN up.interval < 1 AND up.last_review IS NOT NULL THEN 1  -- Learning cards not yet due (priority 1)
          ELSE 3  -- Other cards (shouldn't appear)
        END as priority
      FROM cards c
      LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
      WHERE c.deck_id = $2
        AND (
          up.user_id IS NULL  -- New cards
          OR (up.repetitions = 0 AND up.last_review IS NULL)  -- New cards (initialized but never reviewed)
          OR up.due_date <= CURRENT_TIMESTAMP  -- Due cards (includes learning cards that are due)
          OR (up.interval < 1 AND up.due_date > CURRENT_TIMESTAMP AND up.last_review IS NOT NULL)  -- Learning cards not yet due
        )
      ORDER BY priority ASC, up.due_date ASC NULLS FIRST, c.id ASC
      LIMIT 50`,
      [userId, deckId]
    );
    
    const newCardsCount = result.rows.filter(r => r.is_new).length;
    console.log(`Found ${result.rows.length} due cards for user ${userId} in deck ${deckId}`);
    console.log(`  - Total cards in deck: ${totalCards}`);
    console.log(`  - New cards (no progress): ${newCardsCount}`);
    console.log(`  - Cards with progress: ${result.rows.length - newCardsCount}`);
    
    const cards = result.rows.map(row => ({
      id: row.id,
      deck_id: row.deck_id,
      front: typeof row.front === 'string' ? JSON.parse(row.front) : row.front,
      back: typeof row.back === 'string' ? JSON.parse(row.back) : row.back,
      difficulty: row.difficulty,
      hint: row.hint,
      progress: {
        interval: parseFloat(row.interval) || 0,
        ease_factor: parseFloat(row.ease_factor),
        repetitions: row.repetitions,
        due_date: row.due_date,
        last_review: row.last_review
      }
    }));
    
    res.json(cards);
  } catch (err) {
    console.error('Error fetching due cards:', err);
    res.status(500).json({ error: err.message });
  }
});

// Review a card (update progress based on SRS algorithm)
app.post('/api/cards/:cardId/review', async (req, res) => {
  const cardId = req.params.cardId;
  const { userId, grade } = req.body; // grade: "again", "hard", "good", "easy"
  
  if (!userId || !grade) {
    return res.status(400).json({ error: 'User ID and grade are required' });
  }
  
  if (!['again', 'hard', 'good', 'easy'].includes(grade)) {
    return res.status(400).json({ error: 'Grade must be "again", "hard", "good", or "easy"' });
  }
  
  try {
    // Get current progress or create new (cast user_id to text for comparison)
    const progressResult = await pool.query(
      'SELECT * FROM user_progress WHERE user_id::text = $1::text AND card_id = $2',
      [userId, cardId]
    );
    
    let currentProgress = null;
    if (progressResult.rows.length > 0) {
      const row = progressResult.rows[0];
      currentProgress = {
        interval: parseFloat(row.interval) || 0,
        ease_factor: parseFloat(row.ease_factor),
        repetitions: row.repetitions,
        due_date: row.due_date,
        last_review: row.last_review
      };
    }
    
    // Apply SRS algorithm
    const updatedProgress = reviewCard(currentProgress, grade);
    
    // Insert or update progress
    await pool.query(
      `INSERT INTO user_progress (user_id, card_id, interval, ease_factor, repetitions, due_date, last_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, card_id)
       DO UPDATE SET
         interval = EXCLUDED.interval,
         ease_factor = EXCLUDED.ease_factor,
         repetitions = EXCLUDED.repetitions,
         due_date = EXCLUDED.due_date,
         last_review = EXCLUDED.last_review,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        cardId,
        parseFloat(updatedProgress.interval), // Ensure it's a number, not a string
        updatedProgress.ease_factor,
        updatedProgress.repetitions,
        updatedProgress.due_date,
        updatedProgress.last_review
      ]
    );
    
    res.json({
      message: 'Card reviewed successfully',
      progress: updatedProgress
    });
  } catch (err) {
    console.error('Error reviewing card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Initialize progress for all cards in a deck (when user starts practicing)
app.post('/api/decks/:deckId/init-progress', async (req, res) => {
  const deckId = req.params.deckId;
  const userId = req.body.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Get all cards in deck that don't have progress yet
    const cardsResult = await pool.query(
      `SELECT c.id 
       FROM cards c
       LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2 AND up.card_id IS NULL`,
      [userId, deckId]
    );
    
    console.log(`Initializing progress for ${cardsResult.rows.length} cards for user ${userId} in deck ${deckId}`);
    
    // Initialize progress for each card (due immediately, but NOT reviewed yet)
    // Setting last_review to NULL ensures cards are still counted as "new" until first review
    const now = new Date();
    const initialProgress = {
      interval: 0,
      ease_factor: 2.5,
      repetitions: 0,
      due_date: now,
      last_review: null  // NULL means card hasn't been reviewed yet (still "new")
    };
    
    for (const card of cardsResult.rows) {
      try {
        await pool.query(
          `INSERT INTO user_progress (user_id, card_id, interval, ease_factor, repetitions, due_date, last_review)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, card_id) DO NOTHING`,
          [
            userId,
            card.id,
            parseFloat(initialProgress.interval), // Ensure it's a number
            initialProgress.ease_factor,
            initialProgress.repetitions,
            initialProgress.due_date,
            initialProgress.last_review
          ]
        );
      } catch (insertErr) {
        console.error(`Error inserting progress for card ${card.id}:`, insertErr);
        // Continue with other cards
      }
    }
    
    res.json({
      message: `Progress initialized for ${cardsResult.rows.length} cards`,
      count: cardsResult.rows.length
    });
  } catch (err) {
    console.error('Error initializing progress:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get deck statistics (new, learning, due counts)
app.get('/api/decks/:deckId/statistics', async (req, res) => {
  const deckId = req.params.deckId;
  const userId = req.query.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Count total cards in deck
    const totalCardsResult = await pool.query(
      'SELECT COUNT(*) as count FROM cards WHERE deck_id = $1',
      [deckId]
    );
    const totalCards = parseInt(totalCardsResult.rows[0]?.count || 0);
    
    if (totalCards === 0) {
      return res.json({
        new: 0,
        learning: 0,
        due: 0,
        total: 0
      });
    }
    
    // Count new cards: no user_progress OR has progress but never reviewed (repetitions = 0 and no last_review)
    const newCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2 
         AND (up.user_id IS NULL 
              OR (up.repetitions = 0 AND up.last_review IS NULL))`,
      [userId, deckId]
    );
    const newCards = parseInt(newCardsResult.rows[0]?.count || 0);
    
    // Count learning/green cards: interval < 1 day, has been reviewed at least once
    // Learning cards are cards that have been reviewed but are still in the learning phase
    // Include cards where due_date <= now() so they appear immediately (they're due)
    const learningCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       INNER JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2 
         AND up.interval < 1
         AND up.last_review IS NOT NULL`,
      [userId, deckId]
    );
    const learningCards = parseInt(learningCardsResult.rows[0]?.count || 0);
    
    // Count due cards: due_date <= now() (includes both review cards and learning cards that are due)
    // This is the "red" count - cards that need to be reviewed now
    const dueCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2
         AND (up.user_id IS NULL OR up.due_date <= CURRENT_TIMESTAMP)`,
      [userId, deckId]
    );
    const dueCards = parseInt(dueCardsResult.rows[0]?.count || 0);
    
    // Count mature cards: interval >= 1 day and due_date > now() (review cards not due yet)
    const matureCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       INNER JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2
         AND up.interval >= 1
         AND up.due_date > CURRENT_TIMESTAMP`,
      [userId, deckId]
    );
    const matureCards = parseInt(matureCardsResult.rows[0]?.count || 0);
    
    // Verify: new + learning + due + mature should equal total
    const accountedFor = newCards + learningCards + dueCards + matureCards;
    const unaccounted = totalCards - accountedFor;
    
    console.log(`Deck ${deckId} statistics for user ${userId}:`);
    console.log(`  - New: ${newCards}`);
    console.log(`  - Learning: ${learningCards}`);
    console.log(`  - Due: ${dueCards}`);
    console.log(`  - Mature: ${matureCards}`);
    console.log(`  - Total: ${totalCards}`);
    console.log(`  - Accounted for: ${accountedFor}`);
    if (unaccounted > 0) {
      console.warn(`  - Unaccounted cards: ${unaccounted} (may be cards with invalid progress data)`);
    }
    
    res.json({
      new: newCards,
      learning: learningCards,
      due: dueCards,
      mature: matureCards,
      total: totalCards
    });
  } catch (err) {
    console.error('Error fetching deck statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get study progress for a user (legacy endpoint - kept for compatibility)
app.get('/api/progress/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const result = await pool.query(
      'SELECT * FROM user_progress WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user stats
app.get('/api/stats/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const result = await pool.query(
      'SELECT cards_studied_today, streak FROM users WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0] || { user_id: userId, cards_studied_today: 0, streak: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user stats
app.put('/api/stats/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { cardsStudiedToday, streak } = req.body;
  
  try {
    await pool.query(
      'UPDATE users SET cards_studied_today = $1, streak = $2, updated_at = NOW() WHERE user_id = $3',
      [cardsStudiedToday, streak, userId]
    );
    res.json({ message: 'Stats updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public decks (for community browsing)
app.get('/api/public-decks', async (req, res) => {
  const { language, search, limit = 20, offset = 0 } = req.query;
  
  try {
    let query = `
      SELECT d.*, u.email as creator_email
      FROM decks d
      JOIN users u ON d.user_id = u.user_id
      WHERE d.is_public = true
    `;
    const params = [];
    let paramCount = 0;
    
    if (language && language !== 'all') {
      paramCount++;
      query += ` AND d.language = $${paramCount}`;
      params.push(language);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (d.name ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY d.download_count DESC, d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download a public deck (increment download count)
app.post('/api/decks/:deckId/download', async (req, res) => {
  const deckId = req.params.deckId;
  
  try {
    // Check if deck is public
    const deckResult = await pool.query(
      'SELECT is_public FROM decks WHERE id = $1',
      [deckId]
    );
    
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    if (!deckResult.rows[0].is_public) {
      return res.status(403).json({ error: 'Deck is not public' });
    }
    
    // Increment download count
    await pool.query(
      'UPDATE decks SET download_count = download_count + 1 WHERE id = $1',
      [deckId]
    );
    
    // Get deck with cards
    const deckResult2 = await pool.query(
      'SELECT * FROM decks WHERE id = $1',
      [deckId]
    );
    
    const deck = deckResult2.rows[0];
    deck.cards = deck.cards || [];
    
    res.json(deck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update deck public status
app.put('/api/decks/:id/public', async (req, res) => {
  const deckId = req.params.id;
  const { isPublic } = req.body;
  
  try {
    await pool.query(
      'UPDATE decks SET is_public = $1, updated_at = NOW() WHERE id = $2',
      [isPublic, deckId]
    );
    res.json({ message: 'Deck public status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Suggestions endpoint
app.post('/api/decks/:deckId/ai-suggestions', async (req, res) => {
  const deckId = req.params.deckId;
  const { numSuggestions = 5 } = req.body;
  
  try {
    // Get deck information
    const deckResult = await pool.query(
      'SELECT name, description, language, cards FROM decks WHERE id = $1',
      [deckId]
    );
    
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    const deck = deckResult.rows[0];
    const existingCards = deck.cards || [];
    
    // Get AI suggestions
    const suggestions = await getAISuggestions(
      deck.name,
      deck.language,
      existingCards,
      numSuggestions
    );
    
    res.json({ suggestions });
  } catch (err) {
    console.error('Error getting AI suggestions:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to get AI suggestions',
      details: err.toString()
    });
  }
});

// AI Card Explanation endpoint
app.post('/api/cards/explain', async (req, res) => {
  const { front, back, language } = req.body;
  
  if (!front || !back) {
    return res.status(400).json({ error: 'Front and back are required' });
  }
  
  try {
    const explanation = await getCardExplanation(front, back, language || 'English');
    res.json({ explanation });
  } catch (err) {
    console.error('Error getting card explanation:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to get explanation',
      details: err.toString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (process.env.GITHUB_TOKEN) {
    console.log('AI Suggestions: Enabled (GitHub Llama model)');
  } else {
    console.log('AI Suggestions: Disabled (GITHUB_TOKEN not set)');
  }
});


