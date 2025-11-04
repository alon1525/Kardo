import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getUserDecks, createDeck, deleteDeck, getUserStats, updateDeckPublicStatus } from '../api/decks';

/**
 * User dashboard showing decks, stats, and options to create/import decks
 */
const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [newDeckLanguage, setNewDeckLanguage] = useState('English');
  const [isPublic, setIsPublic] = useState(false);
  const [stats, setStats] = useState({
    cardsStudiedToday: 0,
    streak: 0,
    lastStudyDate: null
  });
  const [loading, setLoading] = useState(true);
  const [creatingDeck, setCreatingDeck] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const userId = currentUser.id || currentUser.uid || currentUser.email;
      console.log('Loading user data. currentUser:', currentUser);
      console.log('Using userId:', userId);
      
      // Load decks from API
      const userDecks = await getUserDecks(userId);
      console.log('Loaded decks:', userDecks);
      setDecks(userDecks);
      
      // Load stats from API
      const userStats = await getUserStats(userId);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) {
      alert('Please enter a deck name');
      return;
    }
    
    if (!currentUser || creatingDeck) return;
    
    try {
      setCreatingDeck(true);
      const userId = currentUser.id || currentUser.uid || currentUser.email;
      const userEmail = currentUser.email || null;
      const newDeck = await createDeck(userId, {
        name: newDeckName.trim(),
        description: newDeckDescription.trim(),
        language: newDeckLanguage,
        isPublic: isPublic
      }, userEmail);
      
      // Update public status if needed
      if (isPublic) {
        await updateDeckPublicStatus(newDeck.id, true);
      }
      
      // Reload decks
      await loadUserData();
      
      // Reset form and close modal
      setNewDeckName('');
      setNewDeckDescription('');
      setNewDeckLanguage('English');
      setIsPublic(false);
      setShowCreateModal(false);
      setCreatingDeck(false);
      
      navigate(`/deck/${newDeck.id}`);
    } catch (error) {
      console.error('Error creating deck:', error);
      alert('Failed to create deck. Please try again.');
      setCreatingDeck(false);
    }
  };

  const handleDeleteDeck = async (deckId, deckName) => {
    if (window.confirm(`Are you sure you want to delete "${deckName}"?`)) {
      if (!currentUser) return;
      
      try {
        await deleteDeck(deckId);
        // Reload decks
        await loadUserData();
      } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Failed to delete deck. Please try again.');
      }
    }
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
              <div className="min-w-[100px]">
                <p className="text-sm text-gray-600">Cards Today</p>
                <p className="text-2xl font-bold min-w-[60px] inline-block">{stats.cardsStudiedToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-3 mr-4">
                <span className="material-icons text-2xl text-green-600">local_fire_department</span>
              </div>
              <div className="min-w-[100px]">
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold min-w-[60px] inline-block">{stats.streak} days</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-full p-3 mr-4">
                <span className="material-icons text-2xl text-purple-600">bar_chart</span>
              </div>
              <div className="min-w-[100px]">
                <p className="text-sm text-gray-600">Total Decks</p>
                <p className="text-2xl font-bold min-w-[60px] inline-block">{decks.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
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
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-xl">Loading decks...</div>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="material-icons text-6xl text-gray-400 mb-4">folder_open</span>
            <h3 className="text-xl font-semibold mb-2">No decks found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try a different search term' : 'Create your first deck to get started'}
            </p>
            {!searchTerm && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                Create Your First Deck
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map(deck => (
              <div
                key={deck.id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all border-2 border-gray-100 hover:border-primary-300 p-6 transform hover:-translate-y-1 relative group"
              >
                <Link to={`/deck/${deck.id}`} className="block">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">{deck.name}</h3>
                  <span className="text-xs bg-gradient-to-r from-primary-500 to-primary-600 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                    {deck.language}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {deck.description && deck.description.length > 35 
                    ? `${deck.description.substring(0, 35)}...` 
                    : deck.description || 'No description'}
                </p>
                <div className="flex items-center text-sm text-gray-600 gap-4">
                  <span className="flex items-center gap-1 min-w-[80px]">
                    <span className="material-icons text-base text-blue-500">description</span>
                    <span className="inline-block min-w-[50px]">{deck.cardCount} cards</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-base text-green-500">calendar_today</span>
                    {new Date(deck.createdAt).toLocaleDateString()}
                  </span>
                </div>
                </Link>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteDeck(deck.id, deck.name);
                  }}
                  className="absolute top-1 right-1 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-full z-10"
                  title="Delete deck"
                >
                  <span className="material-icons text-base">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCreateModal(false);
            setNewDeckName('');
            setNewDeckDescription('');
            setNewDeckLanguage('English');
            setIsPublic(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Create New Deck</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deck Name <span className="text-gray-500">({newDeckName.length}/15)</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Enter deck name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-500">({newDeckDescription.length}/100)</span>
                </label>
                <textarea
                  maxLength={100}
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={newDeckLanguage}
                  onChange={(e) => setNewDeckLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Korean">Korean</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Russian">Russian</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                  Make this deck public (community can download)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateDeck}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
                disabled={!newDeckName.trim() || creatingDeck}
              >
                {creatingDeck ? (
                  <>
                    <span className="material-icons animate-spin text-lg">refresh</span>
                    Creating...
                  </>
                ) : (
                  'Create Deck'
                )}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewDeckName('');
                  setNewDeckDescription('');
                  setNewDeckLanguage('English');
                  setIsPublic(false);
                  setCreatingDeck(false);
                }}
                className="flex-1 btn-secondary"
                disabled={creatingDeck}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Dashboard;

