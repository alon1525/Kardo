import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { loadDecksFromStorage, saveDecksToStorage, loadStatsFromStorage, saveStatsToStorage } from '../utils/localStorage';
import { sampleDecks } from '../data/sampleDecks';

/**
 * User dashboard showing decks, stats, and options to create/import decks
 */
const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [stats, setStats] = useState({
    cardsStudiedToday: 0,
    streak: 0,
    lastStudyDate: null
  });

  useEffect(() => {
    if (currentUser) {
      // Use Supabase user ID (or Firebase UID for backward compatibility)
      const userId = currentUser.id || currentUser.uid;
      
      // Load decks from localStorage
      let userDecks = loadDecksFromStorage(userId);
      
      // If user has no decks, initialize with sample decks
      if (userDecks.length === 0) {
        userDecks = sampleDecks;
        saveDecksToStorage(userId, userDecks);
      }
      
      setDecks(userDecks);
      
      // Load stats
      const userStats = loadStatsFromStorage(userId);
      setStats(userStats);
    }
  }, [currentUser]);

  const handleCreateDeck = () => {
    if (!currentUser) return;
    
    const userId = currentUser.id || currentUser.uid;
    const deckId = Date.now().toString();
    const newDeck = {
      id: deckId,
      name: 'New Deck',
      description: 'Add your description here',
      language: 'English',
      cardCount: 0,
      createdAt: new Date().toISOString(),
      cards: []
    };
    const updatedDecks = [...decks, newDeck];
    setDecks(updatedDecks);
    saveDecksToStorage(userId, updatedDecks);
    navigate(`/deck/${deckId}`);
  };

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deck.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || deck.language === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  const languages = [...new Set(decks.map(deck => deck.language))];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Welcome back!</h1>
            <p className="text-gray-600">Manage your language learning decks</p>
          </div>
          {currentUser && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="text-sm font-medium text-gray-900">{currentUser.email}</p>
            </div>
          )}
        </div>
      </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-3 mr-4">
                <span className="material-icons text-2xl text-blue-600">book</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cards Today</p>
                <p className="text-2xl font-bold">{stats.cardsStudiedToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <span className="material-icons text-2xl text-green-600">local_fire_department</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold">{stats.streak} days</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-full p-3 mr-4">
                <span className="material-icons text-2xl text-purple-600">bar_chart</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Decks</p>
                <p className="text-2xl font-bold">{decks.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleCreateDeck} className="btn-primary flex items-center gap-2">
                <span className="material-icons text-lg">add</span>
                Create New Deck
              </button>
              <Link 
                to="/public-decks"
                className="btn-secondary flex items-center gap-2"
              >
                <span className="material-icons text-lg">upload</span>
                Browse Community Decks
              </Link>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search decks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Languages</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Decks Grid */}
        {filteredDecks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="material-icons text-6xl text-gray-400 mb-4">folder_open</span>
            <h3 className="text-xl font-semibold mb-2">No decks found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try a different search term' : 'Create your first deck to get started'}
            </p>
            {!searchTerm && (
              <button onClick={handleCreateDeck} className="btn-primary">
                Create Your First Deck
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map(deck => (
              <Link
                key={deck.id}
                to={`/deck/${deck.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">{deck.name}</h3>
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                    {deck.language}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{deck.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">📇 {deck.cardCount} cards</span>
                  <span>📅 {new Date(deck.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;

