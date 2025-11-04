import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import { getAISuggestions, getCardExplanation } from './ai-service.js';

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

// Get cards for a deck
app.get('/api/decks/:deckId/cards', async (req, res) => {
  const deckId = req.params.deckId;
  
  try {
    const result = await pool.query(
      'SELECT cards FROM decks WHERE id = $1',
      [deckId]
    );
    const cards = result.rows[0]?.cards || [];
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a card to a deck
app.post('/api/decks/:deckId/cards', async (req, res) => {
  const deckId = req.params.deckId;
  const { front, back, frontAlign, backAlign, frontVerticalAlign, backVerticalAlign, frontFontSize, backFontSize, difficulty } = req.body;
  
  try {
    // Get current cards
    const deckResult = await pool.query('SELECT cards FROM decks WHERE id = $1', [deckId]);
    const currentCards = deckResult.rows[0]?.cards || [];
    
    // Add new card with front/back objects including alignment and font size
    const newCard = {
      id: Date.now(),
      front: {
        content: front,
        align: frontAlign || 'center',
        verticalAlign: frontVerticalAlign || 'middle',
        fontSize: frontFontSize || '18'
      },
      back: {
        content: back,
        align: backAlign || 'center',
        verticalAlign: backVerticalAlign || 'middle',
        fontSize: backFontSize || '18'
      },
      difficulty: difficulty || 'medium'
    };
    currentCards.push(newCard);
    
    // Update deck with new cards array
    await pool.query(
      'UPDATE decks SET cards = $1::jsonb WHERE id = $2',
      [JSON.stringify(currentCards), deckId]
    );
    
    res.json(newCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a card
app.put('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  const { front, back, difficulty } = req.body;
  
  const { deckId } = req.body;
  
  try {
    // Get current cards
    const deckResult = await pool.query('SELECT cards FROM decks WHERE id = $1', [deckId]);
    const cards = deckResult.rows[0]?.cards || [];
    
    // Update the card with proper object structure
    const updatedCards = cards.map(card => 
      card.id == cardId 
        ? { 
            ...card, 
            front: { content: front },
            back: { content: back },
            difficulty 
          }
        : card
    );
    
    // Update deck
    await pool.query(
      'UPDATE decks SET cards = $1::jsonb WHERE id = $2',
      [JSON.stringify(updatedCards), deckId]
    );
    
    res.json({ message: 'Card updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a card
app.delete('/api/cards/:id', async (req, res) => {
  const cardId = req.params.id;
  const { deckId } = req.query;
  
  try {
    // Get current cards
    const deckResult = await pool.query('SELECT cards FROM decks WHERE id = $1', [deckId]);
    const cards = deckResult.rows[0]?.cards || [];
    
    // Remove the card
    const updatedCards = cards.filter(card => card.id != cardId);
    
    // Update deck
    await pool.query(
      'UPDATE decks SET cards = $1::jsonb WHERE id = $2',
      [JSON.stringify(updatedCards), deckId]
    );
    
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get study progress for a user
app.get('/api/progress/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const result = await pool.query(
      'SELECT * FROM study_progress WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record study session
app.post('/api/progress', async (req, res) => {
  const { userId, cardId, difficulty } = req.body;
  
  try {
    await pool.query(
      'INSERT INTO study_progress (user_id, card_id, difficulty, date_reviewed) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, card_id) DO UPDATE SET difficulty = $4, date_reviewed = NOW()',
      [userId, cardId, difficulty, difficulty]
    );
    res.json({ message: 'Progress recorded' });
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


