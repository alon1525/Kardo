import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { getAISuggestions, getCardExplanation } from './ai-service.js';
import { reviewCard } from './srs-algorithm.js';
import { getDefaultSettings, validateSettings, parseLearningSteps } from './user-settings.js';

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
  } : false,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Handle pool errors gracefully (don't crash the server)
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err);
  // Don't crash - just log the error
});

pool.on('connect', (client) => {
  console.log('New database client connected');
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Error code:', err.code);
    // Don't crash - server will continue but database operations may fail
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
            // Priority 0: Due cards (due_date <= now()) - REVIEW cards and learning cards that are DUE
            // Priority 1: Learning cards (interval < 1 day, has been reviewed, NOT due yet)
            // Priority 2: New cards (no user_progress OR never reviewed) - SEPARATE from due cards
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
                up.learning_step,
                CASE 
                  WHEN up.user_id IS NULL THEN true 
                  WHEN up.repetitions = 0 AND up.last_review IS NULL THEN true
                  ELSE false 
                END as is_new,
                CASE 
                  WHEN up.user_id IS NULL THEN 0  -- New cards (priority 0 - FIRST)
                  WHEN up.repetitions = 0 THEN 0  -- New cards (priority 0 - FIRST)
                  WHEN up.due_date <= CURRENT_TIMESTAMP AND up.repetitions != 0 THEN 1  -- Due cards (priority 1)
                  WHEN up.due_date > CURRENT_TIMESTAMP 
                    AND EXTRACT(EPOCH FROM (up.due_date - CURRENT_TIMESTAMP)) / 86400.0 <= 60 
                    AND up.repetitions != 0 THEN 2  -- Review cards (priority 2)
                  ELSE 3  -- Other cards (mature or shouldn't appear)
                END as priority
              FROM cards c
              LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
              WHERE c.deck_id = $2
                AND (
                  up.user_id IS NULL  -- New cards (no progress)
                  OR up.repetitions = 0  -- New cards (never reviewed)
                  OR (up.due_date <= CURRENT_TIMESTAMP AND up.repetitions != 0)  -- Due cards
                  OR (up.due_date > CURRENT_TIMESTAMP 
                      AND EXTRACT(EPOCH FROM (up.due_date - CURRENT_TIMESTAMP)) / 86400.0 <= 60 
                      AND up.repetitions != 0)  -- Review cards (due in <= 60 days)
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
                last_review: row.last_review,
                learning_step: row.learning_step !== null && row.learning_step !== undefined ? row.learning_step : undefined
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
        last_review: row.last_review,
        learning_step: row.learning_step !== null ? row.learning_step : undefined
      };
    }
    
    // Get user settings (or use defaults)
    let userSettings = null;
    try {
      const settingsResult = await pool.query(
        'SELECT * FROM user_settings WHERE user_id::text = $1::text',
        [userId]
      );
      if (settingsResult.rows.length > 0) {
        userSettings = settingsResult.rows[0];
      }
    } catch (settingsError) {
      console.warn('Error fetching user settings, using defaults:', settingsError);
    }
    
    // Apply SRS algorithm with user settings
    const updatedProgress = reviewCard(currentProgress, grade, userSettings);
    
    // Insert or update progress (including learning_step)
    await pool.query(
      `INSERT INTO user_progress (user_id, card_id, interval, ease_factor, repetitions, due_date, last_review, learning_step)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, card_id)
       DO UPDATE SET
         interval = EXCLUDED.interval,
         ease_factor = EXCLUDED.ease_factor,
         repetitions = EXCLUDED.repetitions,
         due_date = EXCLUDED.due_date,
         last_review = EXCLUDED.last_review,
         learning_step = EXCLUDED.learning_step,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        cardId,
        parseFloat(updatedProgress.interval),
        updatedProgress.ease_factor,
        updatedProgress.repetitions,
        updatedProgress.due_date,
        updatedProgress.last_review,
        updatedProgress.learning_step !== undefined ? updatedProgress.learning_step : null
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
    
    // Get user settings for default ease factor
    let defaultEaseFactor = 2.5;
    try {
      const settingsResult = await pool.query(
        'SELECT starting_ease_factor FROM user_settings WHERE user_id::text = $1::text',
        [userId]
      );
      if (settingsResult.rows.length > 0) {
        defaultEaseFactor = parseFloat(settingsResult.rows[0].starting_ease_factor) || 2.5;
      }
    } catch (settingsError) {
      // Use default
    }
    
    // Initialize progress for each card (due immediately, but NOT reviewed yet)
    // Setting last_review to NULL ensures cards are still counted as "new" until first review
    const now = new Date();
    const initialProgress = {
      interval: 0,
      ease_factor: defaultEaseFactor,
      repetitions: 0,
      due_date: now,
      last_review: null,  // NULL means card hasn't been reviewed yet (still "new")
      learning_step: 0   // Start at first learning step (index 0)
    };
    
    for (const card of cardsResult.rows) {
      try {
        await pool.query(
          `INSERT INTO user_progress (user_id, card_id, interval, ease_factor, repetitions, due_date, last_review, learning_step)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id, card_id) DO NOTHING`,
          [
            userId,
            card.id,
            parseFloat(initialProgress.interval),
            initialProgress.ease_factor,
            initialProgress.repetitions,
            initialProgress.due_date,
            initialProgress.last_review,
            initialProgress.learning_step
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
        review: 0,
        mature: 0,
        total: 0
      });
    }
    
    // NEW = repetitions = 0
    const newCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       LEFT JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2 
         AND (up.user_id IS NULL OR up.repetitions = 0)`,
      [userId, deckId]
    );
    const newCards = parseInt(newCardsResult.rows[0]?.count || 0);
    
    // DUE = due_date <= now() AND repetitions != 0
    const dueCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       INNER JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2
         AND up.due_date <= CURRENT_TIMESTAMP
         AND up.repetitions != 0`,
      [userId, deckId]
    );
    const dueCards = parseInt(dueCardsResult.rows[0]?.count || 0);
    
    // Review = due_date > now() AND (due_date - now()) <= 60 days AND repetitions != 0
    // Cards that are due in the next 60 days (but not due yet)
    const reviewCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       INNER JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2
         AND up.due_date > CURRENT_TIMESTAMP
         AND EXTRACT(EPOCH FROM (up.due_date - CURRENT_TIMESTAMP)) / 86400.0 <= 60
         AND up.repetitions != 0`,
      [userId, deckId]
    );
    const reviewCards = parseInt(reviewCardsResult.rows[0]?.count || 0);
    
    // Mature = due_date > now() AND (due_date - now()) >= 60 days AND repetitions != 0
    // Cards that are due in 60+ days
    const matureCardsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM cards c
       INNER JOIN user_progress up ON c.id = up.card_id AND up.user_id::text = $1::text
       WHERE c.deck_id = $2
         AND up.due_date > CURRENT_TIMESTAMP
         AND EXTRACT(EPOCH FROM (up.due_date - CURRENT_TIMESTAMP)) / 86400.0 >= 60
         AND up.repetitions != 0`,
      [userId, deckId]
    );
    const matureCards = parseInt(matureCardsResult.rows[0]?.count || 0);
    
    // Verify: new + due + review + mature should equal total
    const accountedFor = newCards + dueCards + reviewCards + matureCards;
    const unaccounted = totalCards - accountedFor;
    
    console.log(`Deck ${deckId} statistics for user ${userId}:`);
    console.log(`  - New (repetitions=0): ${newCards}`);
    console.log(`  - Due (due_date <= now): ${dueCards}`);
    console.log(`  - Review/Learning (due in <= 60 days): ${reviewCards}`);
    console.log(`  - Mature (due in >= 60 days): ${matureCards}`);
    console.log(`  - Total: ${totalCards}`);
    console.log(`  - Accounted for: ${accountedFor}`);
    if (unaccounted > 0) {
      console.warn(`  - Unaccounted cards: ${unaccounted} (may be cards with invalid progress data)`);
    }
    
    res.json({
      new: newCards,
      learning: reviewCards, // Keep "learning" for backward compatibility
      due: dueCards,
      review: reviewCards,
      mature: matureCards,
      total: totalCards
    });
  } catch (err) {
    console.error('Error fetching deck statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user settings
app.get('/api/users/:userId/settings', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id::text = $1::text',
      [userId]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Return default settings if none exist
      res.json(getDefaultSettings());
    }
  } catch (err) {
    console.error('Error fetching user settings:', err);
    // If table doesn't exist, return defaults
    if (err.message && err.message.includes('does not exist')) {
      res.json(getDefaultSettings());
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Update user settings
app.put('/api/users/:userId/settings', async (req, res) => {
  const userId = req.params.userId;
  const settings = req.body;
  
  try {
    // Validate and sanitize settings
    const validatedSettings = validateSettings(settings);
    validatedSettings.user_id = userId;
    
    // Insert or update
    await pool.query(
      `INSERT INTO user_settings (
        user_id, max_interval, starting_ease_factor, easy_bonus, 
        interval_modifier, hard_interval_factor, new_cards_per_day, learning_steps
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id)
      DO UPDATE SET
        max_interval = EXCLUDED.max_interval,
        starting_ease_factor = EXCLUDED.starting_ease_factor,
        easy_bonus = EXCLUDED.easy_bonus,
        interval_modifier = EXCLUDED.interval_modifier,
        hard_interval_factor = EXCLUDED.hard_interval_factor,
        new_cards_per_day = EXCLUDED.new_cards_per_day,
        learning_steps = EXCLUDED.learning_steps,
        updated_at = CURRENT_TIMESTAMP`,
      [
        validatedSettings.user_id,
        validatedSettings.max_interval,
        validatedSettings.starting_ease_factor,
        validatedSettings.easy_bonus,
        validatedSettings.interval_modifier,
        validatedSettings.hard_interval_factor,
        validatedSettings.new_cards_per_day,
        validatedSettings.learning_steps
      ]
    );
    
    res.json({ message: 'Settings updated successfully', settings: validatedSettings });
  } catch (err) {
    console.error('Error updating user settings:', err);
    // If table doesn't exist, return error with migration hint
    if (err.message && err.message.includes('does not exist')) {
      res.status(500).json({ 
        error: 'Database migration required',
        message: 'Please run: database/run_migration_learning_steps.sql'
      });
    } else {
      res.status(500).json({ error: err.message });
    }
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (process.env.GITHUB_TOKEN) {
    console.log('AI Suggestions: Enabled (GitHub Llama model)');
  } else {
    console.log('AI Suggestions: Disabled (GITHUB_TOKEN not set)');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});


