import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * Public decks page - browse and search community decks
 */
const PublicDecks = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [filteredDecks, setFilteredDecks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicDecks();
  }, []);

  useEffect(() => {
    if (decks.length > 0 || loading === false) {
      filterDecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterLanguage]);

  const fetchPublicDecks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/public-decks');
      if (!response.ok) {
        throw new Error('Failed to fetch public decks');
      }
      const data = await response.json();
      setDecks(data || []);
      setFilteredDecks(data || []);
    } catch (error) {
      console.error('Error fetching public decks:', error);
      // If API fails, use empty array
      setDecks([]);
      setFilteredDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDecks = () => {
    let filtered = decks;

    // Filter by search term (searches in name and description)
    if (searchTerm) {
      filtered = filtered.filter(deck => 
        deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deck.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by language
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(deck => deck.language === filterLanguage);
    }

    // Sort by download count (most downloaded first)
    filtered.sort((a, b) => b.download_count - a.download_count);

    setFilteredDecks(filtered);
  };

  const handleDownloadDeck = async (deckId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/decks/${deckId}/download`, {
        method: 'POST'
      });
      const downloadedDeck = await response.json();
      
      // Save to user's decks (localStorage for now)
      const userId = currentUser?.id || currentUser?.uid;
      const userDecks = JSON.parse(localStorage.getItem(`decks_${userId}`) || '[]');
      
      // Create a copy with a new ID for the user
      const newDeck = {
        ...downloadedDeck,
        id: Date.now().toString(),
        user_id: userId,
        is_public: false // Downloaded decks become private
      };
      
      userDecks.push(newDeck);
      localStorage.setItem(`decks_${userId}`, JSON.stringify(userDecks));
      
      alert('Deck downloaded successfully! Redirecting to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error downloading deck:', error);
      alert('Error downloading deck');
    }
  };

  const languages = [...new Set(decks.map(deck => deck.language))];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Community Decks</h1>
          <p className="text-gray-600">Discover and download decks shared by the community</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Search decks by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
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

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <span className="material-icons text-6xl text-gray-400 animate-spin">refresh</span>
            <p className="mt-4 text-gray-600">Loading public decks...</p>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="material-icons text-6xl text-gray-400 mb-4">search_off</span>
            <h3 className="text-xl font-semibold mb-2">No decks found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try a different search term' : 'No public decks available yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map(deck => (
              <div
                key={deck.id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all border-2 border-gray-100 hover:border-primary-300 p-6 transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">{deck.name}</h3>
                  <span className="text-xs bg-gradient-to-r from-primary-500 to-primary-600 text-white px-3 py-1 rounded-full font-semibold shadow-sm">
                    {deck.language}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{deck.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-base">description</span>
                    {deck.card_count || 0} cards
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-base">download</span>
                    {deck.download_count || 0} downloads
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleDownloadDeck(deck.id)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <span className="material-icons text-lg">download</span>
                    Download Deck
                  </button>
                  <div className="text-xs text-gray-500">
                    by {deck.creator_email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PublicDecks;

