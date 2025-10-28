import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { loadDecksFromStorage, saveDecksToStorage, loadProgressFromStorage, saveProgressToStorage, loadStatsFromStorage, saveStatsToStorage } from '../utils/localStorage';
import Flashcard from '../components/Flashcard';

/**
 * Deck page with flashcards and review mode
 */
const DeckPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (currentUser && deckId) {
      const userDecks = loadDecksFromStorage(currentUser.uid);
      const foundDeck = userDecks.find(d => d.id === deckId);
      
      if (foundDeck) {
        setDeck(foundDeck);
        setCards(foundDeck.cards || []);
      } else {
        navigate('/dashboard');
      }
    }
  }, [currentUser, deckId, navigate]);

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  const handleAnswer = async (difficulty) => {
    if (!currentUser || !deckId) return;

    // Update progress
    const progress = loadProgressFromStorage(currentUser.uid);
    if (!progress[deckId]) {
      progress[deckId] = {};
    }
    progress[deckId][cards[currentCardIndex].id] = {
      difficulty,
      dateReviewed: new Date().toISOString()
    };
    saveProgressToStorage(currentUser.uid, progress);

    // Update stats
    const stats = loadStatsFromStorage(currentUser.uid);
    const today = new Date().toDateString();
    if (stats.lastStudyDate === today) {
      stats.cardsStudiedToday += 1;
    } else {
      stats.cardsStudiedToday = 1;
      // Update streak
      if (stats.lastStudyDate) {
        const lastDate = new Date(stats.lastStudyDate);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          stats.streak += 1;
        } else {
          stats.streak = 1;
        }
      } else {
        stats.streak = 1;
      }
      stats.lastStudyDate = today;
    }
    saveStatsToStorage(currentUser.uid, stats);

    // Move to next card or finish review
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // Review complete
      setReviewMode(false);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      alert('Review complete! Great job! 🎉');
    }
  };

  const handleStartReview = () => {
    if (cards.length === 0) {
      alert('Add some cards first before starting a review!');
      return;
    }
    setReviewMode(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  const handleAddCard = () => {
    const newCard = {
      id: Date.now().toString(),
      front: '',
      back: '',
      difficulty: 'medium'
    };
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    
    if (currentUser && deck) {
      const userDecks = loadDecksFromStorage(currentUser.uid);
      const updatedDecks = userDecks.map(d => 
        d.id === deckId 
          ? { ...d, cards: updatedCards, cardCount: updatedCards.length }
          : d
      );
      saveDecksToStorage(currentUser.uid, updatedDecks);
      setDeck({ ...deck, cards: updatedCards, cardCount: updatedCards.length });
    }
  };

  const handleUpdateCard = (cardId, field, value) => {
    const updatedCards = cards.map(card =>
      card.id === cardId ? { ...card, [field]: value } : card
    );
    setCards(updatedCards);
    
    if (currentUser && deck) {
      const userDecks = loadDecksFromStorage(currentUser.uid);
      const updatedDecks = userDecks.map(d =>
        d.id === deckId
          ? { ...d, cards: updatedCards, cardCount: updatedCards.length }
          : d
      );
      saveDecksToStorage(currentUser.uid, updatedDecks);
      setDeck({ ...deck, cards: updatedCards, cardCount: updatedCards.length });
    }
  };

  const handleDeleteCard = (cardId) => {
    const updatedCards = cards.filter(card => card.id !== cardId);
    setCards(updatedCards);
    
    if (currentUser && deck) {
      const userDecks = loadDecksFromStorage(currentUser.uid);
      const updatedDecks = userDecks.map(d =>
        d.id === deckId
          ? { ...d, cards: updatedCards, cardCount: updatedCards.length }
          : d
      );
      saveDecksToStorage(currentUser.uid, updatedDecks);
      setDeck({ ...deck, cards: updatedCards, cardCount: updatedCards.length });
    }
  };

  const handleDeleteDeck = () => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      if (currentUser) {
        const userDecks = loadDecksFromStorage(currentUser.uid);
        const updatedDecks = userDecks.filter(d => d.id !== deckId);
        saveDecksToStorage(currentUser.uid, updatedDecks);
        navigate('/dashboard');
      }
    }
  };

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-primary-600 hover:text-primary-700 mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-gray-900">{deck.name}</h1>
            <p className="text-gray-600 mt-1">{deck.description}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddCard} className="btn-primary flex items-center gap-2">
              <span className="material-icons">add</span>
              Add Card
            </button>
            <button 
              onClick={() => alert('AI suggestions coming soon!')}
              className="btn-secondary flex items-center gap-2"
            >
              <span className="material-icons">smart_toy</span>
              AI Suggestions
            </button>
            <button onClick={handleDeleteDeck} className="btn-danger flex items-center gap-2">
              <span className="material-icons">delete</span>
              Delete Deck
            </button>
          </div>
        </div>

        {/* Review Mode */}
        {reviewMode && cards.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Card {currentCardIndex + 1} of {cards.length}
                </p>
              </div>
              <Flashcard
                card={cards[currentCardIndex]}
                isFlipped={showAnswer}
                onFlip={handleFlip}
              />
              <div className="mt-8 flex justify-center gap-4">
                <button
                  onClick={() => handleAnswer('hard')}
                  className="btn-danger"
                >
                  😰 Hard
                </button>
                <button
                  onClick={() => handleAnswer('medium')}
                  className="btn-secondary"
                >
                  😐 Unknown
                </button>
                <button
                  onClick={() => handleAnswer('easy')}
                  className="btn-success"
                >
                  ✨ Known
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cards List */}
        {!reviewMode && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Cards ({cards.length})
              </h2>
              {cards.length > 0 && (
                <button onClick={handleStartReview} className="btn-primary">
                  📖 Start Review
                </button>
              )}
            </div>

            {cards.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2">No cards yet</h3>
                <p className="text-gray-600 mb-6">Add your first card to get started</p>
                <button onClick={handleAddCard} className="btn-primary">
                  Add Your First Card
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, index) => (
                  <div key={card.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm text-gray-500">Card #{index + 1}</span>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Front
                        </label>
                        <input
                          type="text"
                          value={card.front}
                          onChange={(e) => handleUpdateCard(card.id, 'front', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Question or word"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Back
                        </label>
                        <input
                          type="text"
                          value={card.back}
                          onChange={(e) => handleUpdateCard(card.id, 'back', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Answer or translation"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DeckPage;

