const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

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
  
  try {
    const result = await pool.query(
      'SELECT * FROM decks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    // Parse cards JSON from each deck
    const decks = result.rows.map(deck => ({
      ...deck,
      cards: deck.cards || []
    }));
    
    res.json(decks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new deck
app.post('/api/decks', async (req, res) => {
  const { userId, name, description, language } = req.body;
  
  try {
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
  const { front, back, difficulty } = req.body;
  
  try {
    // Get current cards
    const deckResult = await pool.query('SELECT cards FROM decks WHERE id = $1', [deckId]);
    const currentCards = deckResult.rows[0]?.cards || [];
    
    // Add new card with front/back objects
    const newCard = {
      id: Date.now(),
      front: {
        content: front
      },
      back: {
        content: back
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


