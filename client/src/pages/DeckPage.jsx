import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { loadDecksFromStorage, saveDecksToStorage } from '../utils/localStorage';
import Flashcard from '../components/Flashcard';

/**
 * Deck page with tabs for cards management, editing, and study modes
 */
const DeckPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [activeTab, setActiveTab] = useState('cards'); // cards, edit, study
  
  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (currentUser && deckId) {
      const userId = currentUser.id || currentUser.uid;
      const userDecks = loadDecksFromStorage(userId);
      const foundDeck = userDecks.find(d => d.id === deckId);
      
      if (foundDeck) {
        setDeck(foundDeck);
        setCards(foundDeck.cards || []);
      } else {
        navigate('/dashboard');
      }
    }
  }, [currentUser, deckId, navigate]);

  const saveDeck = () => {
    if (!currentUser || !deck) return;
    const userId = currentUser.id || currentUser.uid;
    const userDecks = loadDecksFromStorage(userId);
    const updatedDecks = userDecks.map(d => 
      d.id === deckId ? { ...d, cards, cardCount: cards.length } : d
    );
    saveDecksToStorage(userId, updatedDecks);
  };

  const handleAddCard = () => {
    const newCard = {
      id: Date.now().toString(),
      front: {
        content: ''
      },
      back: {
        content: ''
      },
      difficulty: 'medium'
    };
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    saveDeck();
  };

  const handleUpdateCard = (cardId, field, value) => {
    const updatedCards = cards.map(card => {
      if (card.id === cardId) {
        if (field === 'front' || field === 'back') {
          return { ...card, [field]: { content: value } };
        }
        return { ...card, [field]: value };
      }
      return card;
    });
    setCards(updatedCards);
    saveDeck();
  };

  const handleDeleteCard = (cardId) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
    const updatedCards = cards.filter(card => card.id !== cardId);
    setCards(updatedCards);
      saveDeck();
    }
  };

  const handleDeleteDeck = () => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      if (currentUser) {
        const userId = currentUser.id || currentUser.uid;
        const userDecks = loadDecksFromStorage(userId);
        const updatedDecks = userDecks.filter(d => d.id !== deckId);
        saveDecksToStorage(userId, updatedDecks);
        navigate('/dashboard');
      }
    }
  };

  const handleStartReview = () => {
    if (cards.length === 0) {
      alert('Add some cards first before starting a review!');
      return;
    }
    setActiveTab('study');
    setReviewMode(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsFlipped(false);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = (difficulty) => {
    // Move to next card or finish
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      setReviewMode(false);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      alert('Review complete! Great job! 🎉');
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
        <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2"
            >
            <span className="material-icons">arrow_back</span>
            Back to Dashboard
            </button>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{deck.name}</h1>
                <p className="text-gray-600 mb-4">{deck.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-base">description</span>
                    {cards.length} cards
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-base">translate</span>
                    {deck.language}
                  </span>
        </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => alert('AI suggestions feature coming soon!')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <span className="material-icons">smart_toy</span>
                  AI Suggestions
                </button>
                <button
                  onClick={handleDeleteDeck} 
                  className="btn-danger flex items-center gap-2"
                >
                  <span className="material-icons">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow p-2 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => { setActiveTab('cards'); setReviewMode(false); }}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'cards' 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-icons">format_list_bulleted</span>
                  My Cards
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('edit'); setReviewMode(false); }}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'edit' 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-icons">edit</span>
                  Edit Cards
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('study'); }}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'study' 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-icons">school</span>
                  Study Modes
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'cards' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Cards ({cards.length})</h2>
              <button onClick={handleAddCard} className="btn-primary flex items-center gap-2">
                <span className="material-icons">add</span>
                Add Card
                </button>
            </div>

            {cards.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <span className="material-icons text-6xl text-gray-400 mb-4">description</span>
                <h3 className="text-xl font-semibold mb-2">No cards yet</h3>
                <p className="text-gray-600 mb-6">Add your first card to get started</p>
                <button onClick={handleAddCard} className="btn-primary">
                  Add Your First Card
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card, index) => (
                  <div key={card.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete card"
                      >
                        <span className="material-icons text-base">delete</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Front</p>
                        <p className="font-medium">{card.front?.content || 'Empty'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Back</p>
                        <p className="text-gray-700">{card.back?.content || 'Empty'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit Cards</h2>
              <button onClick={handleAddCard} className="btn-primary flex items-center gap-2">
                <span className="material-icons">add</span>
                Add New Card
              </button>
            </div>

            {cards.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <span className="material-icons text-6xl text-gray-400 mb-4">edit</span>
                <h3 className="text-xl font-semibold mb-2">No cards to edit</h3>
                <p className="text-gray-600 mb-6">Add a card to start editing</p>
                <button onClick={handleAddCard} className="btn-primary">
                  Add Your First Card
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card, index) => (
                  <div key={card.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Card #{index + 1}</h3>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="btn-danger text-sm"
                      >
                        <span className="material-icons text-base mr-1">delete</span>
                        Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Front
                        </label>
                        <input
                          type="text"
                          value={card.front?.content || ''}
                          onChange={(e) => handleUpdateCard(card.id, 'front', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Question or word"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Back
                        </label>
                        <input
                          type="text"
                          value={card.back?.content || ''}
                          onChange={(e) => handleUpdateCard(card.id, 'back', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Answer or translation"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'study' && (
          <div>
            {!reviewMode ? (
              <div>
                <h2 className="text-xl font-semibold mb-6">Choose a Study Mode</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Flashcard Mode */}
                  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleStartReview}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-100 rounded-full p-3">
                        <span className="material-icons text-blue-600">style</span>
                      </div>
                      <h3 className="text-lg font-semibold">Flashcard Review</h3>
                    </div>
                    <p className="text-gray-600 text-sm">Review all cards in the deck, flip to see answers</p>
                  </div>

                  {/* Test Mode */}
                  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-green-100 rounded-full p-3">
                        <span className="material-icons text-green-600">quiz</span>
                      </div>
                      <h3 className="text-lg font-semibold">Test Mode</h3>
                    </div>
                    <p className="text-gray-600 text-sm">Coming soon: Test your knowledge with typing</p>
                  </div>

                  {/* Match Mode */}
                  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-purple-100 rounded-full p-3">
                        <span className="material-icons text-purple-600">group_work</span>
                      </div>
                      <h3 className="text-lg font-semibold">Match Game</h3>
                    </div>
                    <p className="text-gray-600 text-sm">Coming soon: Match questions with answers</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600">
                      Card {currentCardIndex + 1} of {cards.length}
                    </p>
                  </div>
                  
                  <Flashcard 
                    card={cards[currentCardIndex]}
                    isFlipped={isFlipped}
                    onFlip={handleFlip}
                  />

                  <div className="mt-8 flex justify-center gap-4">
                    <button
                      onClick={() => handleAnswer('hard')}
                      className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons">sentiment_very_dissatisfied</span>
                      Hard
                    </button>
                    <button
                      onClick={() => handleAnswer('medium')}
                      className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons">sentiment_neutral</span>
                      Unknown
                    </button>
                    <button
                      onClick={() => handleAnswer('easy')}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons">sentiment_very_satisfied</span>
                      Known
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckPage;
