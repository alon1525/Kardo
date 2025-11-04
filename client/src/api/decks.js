// API utility functions for deck operations
const API_BASE_URL = 'http://localhost:5000/api';

// Get all decks for a user
export const getUserDecks = async (userId) => {
  try {
    console.log('Fetching decks for userId:', userId);
    const response = await fetch(`${API_BASE_URL}/decks/${userId}`);
    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch decks. Status:', response.status, 'Error:', errorText);
      throw new Error(`Failed to fetch decks: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    console.log('Received decks data:', data);
    console.log('Number of decks:', Array.isArray(data) ? data.length : 'Not an array');
    // Transform database format to frontend format
    if (!Array.isArray(data)) {
      console.error('Expected array but got:', typeof data, data);
      return [];
    }
    return data.map(deck => ({
      id: deck.id.toString(),
      name: deck.name,
      description: deck.description,
      language: deck.language,
      cardCount: Array.isArray(deck.cards) ? deck.cards.length : 0,
      cards: Array.isArray(deck.cards) ? deck.cards : [],
      isPublic: deck.is_public || false,
      createdAt: deck.created_at,
      downloadCount: deck.download_count || 0
    }));
  } catch (error) {
    console.error('Error fetching decks:', error);
    return [];
  }
};

// Create a new deck
export const createDeck = async (userId, deckData, userEmail = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/decks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email: userEmail,
        name: deckData.name,
        description: deckData.description,
        language: deckData.language,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to create deck');
    }
    const data = await response.json();
    return {
      id: data.id.toString(),
      name: data.name,
      description: data.description,
      language: data.language,
      cardCount: 0,
      cards: [],
      isPublic: data.isPublic || false,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error creating deck:', error);
    throw error;
  }
};

// Update a deck
export const updateDeck = async (deckId, deckData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: deckData.name,
        description: deckData.description,
        language: deckData.language,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update deck');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating deck:', error);
    throw error;
  }
};

// Delete a deck
export const deleteDeck = async (deckId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete deck');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting deck:', error);
    throw error;
  }
};

// Get cards for a deck
export const getDeckCards = async (deckId) => {
  try {
    console.log('Fetching cards for deckId:', deckId);
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/cards`);
    console.log('Cards response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch cards. Status:', response.status, 'Error:', errorText);
      throw new Error(`Failed to fetch cards: ${response.status}`);
    }
    const data = await response.json();
    console.log('Received cards data:', data);
    console.log('Is array?', Array.isArray(data));
    if (!Array.isArray(data)) {
      console.error('Cards data is not an array:', typeof data, data);
      return [];
    }
    // Ensure each card has the correct structure - ALWAYS normalize here
    return data.map((card, index) => {
      if (!card) {
        console.warn('Null card at index', index);
        return null;
      }
      // Normalize card structure - ensure front and back are always objects with STRING content
      let front = { content: '', align: 'center', verticalAlign: 'middle', fontSize: '18' };
      let back = { content: '', align: 'center', verticalAlign: 'middle', fontSize: '18' };
      
      if (typeof card.front === 'string') {
        front = { content: card.front, align: 'center', verticalAlign: 'middle', fontSize: '18' };
      } else if (card.front && typeof card.front === 'object') {
        // Extract content and ensure it's a string
        const content = card.front.content || card.front.text || '';
        front = { 
          content: String(content), 
          align: card.front.align || 'center',
          verticalAlign: card.front.verticalAlign || 'middle',
          fontSize: card.front.fontSize || '18'
        };
      }
      
      if (typeof card.back === 'string') {
        back = { content: card.back, align: 'center', verticalAlign: 'middle', fontSize: '18' };
      } else if (card.back && typeof card.back === 'object') {
        // Extract content and ensure it's a string
        const content = card.back.content || card.back.text || '';
        back = { 
          content: String(content), 
          align: card.back.align || 'center',
          verticalAlign: card.back.verticalAlign || 'middle',
          fontSize: card.back.fontSize || '18'
        };
      }
      
      const normalizedCard = {
        id: card.id || card.card_id || `card-${index}`,
        front: front,
        back: back,
        difficulty: card.difficulty || 'medium'
      };
      
      // Verify normalization
      if (typeof normalizedCard.front.content !== 'string' || typeof normalizedCard.back.content !== 'string') {
        console.error('Card normalization failed:', normalizedCard);
        // Force string conversion
        normalizedCard.front.content = String(normalizedCard.front.content || '');
        normalizedCard.back.content = String(normalizedCard.back.content || '');
      }
      
      return normalizedCard;
    }).filter(card => card !== null);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return [];
  }
};

// Add a card to a deck
export const addCard = async (deckId, cardData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        front: cardData.front?.content || cardData.front,
        back: cardData.back?.content || cardData.back,
        frontAlign: cardData.front?.align || 'center',
        backAlign: cardData.back?.align || 'center',
        frontVerticalAlign: cardData.front?.verticalAlign || 'middle',
        backVerticalAlign: cardData.back?.verticalAlign || 'middle',
        frontFontSize: cardData.front?.fontSize || '18',
        backFontSize: cardData.back?.fontSize || '18',
        difficulty: cardData.difficulty || 'medium',
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to add card');
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding card:', error);
    throw error;
  }
};

// Update a card
export const updateCard = async (cardId, deckId, cardData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deckId,
        front: cardData.front?.content || cardData.front,
        back: cardData.back?.content || cardData.back,
        difficulty: cardData.difficulty || 'medium',
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update card');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating card:', error);
    throw error;
  }
};

// Delete a card
export const deleteCard = async (cardId, deckId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cards/${cardId}?deckId=${deckId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete card');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting card:', error);
    throw error;
  }
};

// Get user stats
export const getUserStats = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/stats/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    const data = await response.json();
    return {
      cardsStudiedToday: data.cards_studied_today || 0,
      streak: data.streak || 0,
      lastStudyDate: null
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      cardsStudiedToday: 0,
      streak: 0,
      lastStudyDate: null
    };
  }
};

// Update deck public status
export const updateDeckPublicStatus = async (deckId, isPublic) => {
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/public`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isPublic }),
    });
    if (!response.ok) {
      throw new Error('Failed to update deck status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating deck status:', error);
    throw error;
  }
};

// Get AI suggestions for a deck
export const getAISuggestions = async (deckId, numSuggestions = 5) => {
  try {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/ai-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ numSuggestions }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get AI suggestions');
    }
    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    throw error;
  }
};

// Get AI explanation for a card
export const getCardExplanation = async (front, back, language = 'English') => {
  try {
    const response = await fetch(`${API_BASE_URL}/cards/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ front, back, language }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get explanation');
    }
    const data = await response.json();
    return data.explanation || '';
  } catch (error) {
    console.error('Error getting card explanation:', error);
    throw error;
  }
};

