import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Flashcard from '../components/Flashcard';
import { getUserDecks, getDeckCards, addCard, updateCard, deleteCard, deleteDeck, getAISuggestions } from '../api/decks';

// Simple markdown renderer component
const SimpleMarkdown = ({ text, invert = false }) => {
  if (!text) return null;
  
  const textColor = invert ? 'text-white' : 'text-gray-900';
  const codeBg = invert ? 'bg-white/20' : 'bg-gray-200';
  
  // Convert markdown to HTML - process in order
  // First, protect code blocks
  const codePlaceholder = '__CODE_BLOCK__';
  const codes = [];
  let html = text.replace(/`([^`]+)`/g, (match, content) => {
    const placeholder = `${codePlaceholder}${codes.length}`;
    codes.push(`<code class="${codeBg} px-1 rounded font-mono">${content}</code>`);
    return placeholder;
  });
  
  // Process bold (double asterisks)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  
  // Process italic (single asterisks that are not part of bold)
  html = html.replace(/\*([^*]+?)\*/g, '<em class="italic">$1</em>');
  
  // Restore code blocks
  codes.forEach((code, index) => {
    html = html.replace(`${codePlaceholder}${index}`, code);
  });
  
  // Process headings and line breaks
  html = html
    .replace(/^## (.*)$/gm, '<h2 class="text-xl font-bold mb-2 mt-4">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="text-2xl font-bold mb-2 mt-4">$1</h1>')
    .replace(/\n/g, '<br />');
  
  return <div className={textColor} dangerouslySetInnerHTML={{ __html: html }} />;
};

/**
 * Deck page with tabs for cards management, editing, and study modes
 */
const DeckPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [deckMode, setDeckMode] = useState(null); // null = mode selector, 'add-cards', 'edit-cards', 'practice', 'ai-suggestions', 'game-modes'
  const [loadingCards, setLoadingCards] = useState(false);
  
  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Card editor mode (full-screen card creation)
  const [cardEditorMode, setCardEditorMode] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null); // Track which card we're editing
  const [editingCard, setEditingCard] = useState({
    front: '',
    back: '',
    difficulty: 'medium',
    cardType: 'basic', // 'basic', 'basic-reversed'
    frontAlign: 'center', // 'left', 'center', 'right'
    backAlign: 'center', // 'left', 'center', 'right'
    frontVerticalAlign: 'middle', // 'top', 'middle', 'bottom'
    backVerticalAlign: 'middle', // 'top', 'middle', 'bottom'
    frontFontSize: '18', // Font size in pixels
    backFontSize: '18' // Font size in pixels
  });
  const [savingCard, setSavingCard] = useState(false);
  const [showPreview, setShowPreview] = useState({ front: false, back: false });
  const [activeTextarea, setActiveTextarea] = useState('front'); // Track which textarea is active

  useEffect(() => {
    if (currentUser && deckId) {
      loadDeckData();
    }
  }, [currentUser, deckId]);

  const normalizeCard = (card) => {
    if (!card) return null;
    // Ensure front and back are always objects with content strings and alignment
    const front = typeof card.front === 'string' 
      ? { content: card.front, align: 'center', verticalAlign: 'middle', fontSize: '18' }
      : (card.front && typeof card.front === 'object' 
        ? { 
            content: String(card.front.content || card.front.text || ''), 
            align: card.front.align || 'center',
            verticalAlign: card.front.verticalAlign || 'middle',
            fontSize: card.front.fontSize || '18'
          }
        : { content: '', align: 'center', verticalAlign: 'middle', fontSize: '18' });
    
    const back = typeof card.back === 'string'
      ? { content: card.back, align: 'center', verticalAlign: 'middle', fontSize: '18' }
      : (card.back && typeof card.back === 'object'
        ? { 
            content: String(card.back.content || card.back.text || ''), 
            align: card.back.align || 'center',
            verticalAlign: card.back.verticalAlign || 'middle',
            fontSize: card.back.fontSize || '18'
          }
        : { content: '', align: 'center', verticalAlign: 'middle', fontSize: '18' });
    
    return {
      id: card.id || `card-${Date.now()}-${Math.random()}`,
      front: front,
      back: back,
      difficulty: card.difficulty || 'medium'
    };
  };

  const loadDeckData = async () => {
    if (!currentUser || !deckId) return;
    
    try {
      // Reset card editor mode when loading deck
      setCardEditorMode(false);
      setLoadingCards(true);
      // Clear cards immediately to prevent rendering with old data
      setCards([]);
      
      const userId = currentUser.id || currentUser.uid || currentUser.email;
      const userDecks = await getUserDecks(userId);
      const foundDeck = userDecks.find(d => d.id === deckId || d.id.toString() === deckId);
      
      if (foundDeck) {
        setDeck(foundDeck);
        // Load cards from API
        const deckCards = await getDeckCards(deckId);
        console.log('Loaded cards:', deckCards);
        
        // Normalize cards IMMEDIATELY before setting state
        const normalizedCards = Array.isArray(deckCards) 
          ? deckCards.map(normalizeCard).filter(card => card !== null)
          : [];
        
        // Double-check all cards are properly normalized
        normalizedCards.forEach((card, idx) => {
          if (card && (typeof card.front?.content !== 'string' || typeof card.back?.content !== 'string')) {
            console.error(`Card ${idx} not properly normalized:`, card);
            // Fix it
            card.front = { content: String(card.front?.content || '') };
            card.back = { content: String(card.back?.content || '') };
          }
        });
        
        console.log('Normalized cards:', normalizedCards);
        // Set normalized cards - this ensures they're never in wrong format
        setCards(normalizedCards);
      } else {
        console.warn('Deck not found, redirecting to dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading deck:', error);
      // Don't navigate away on error, just show empty state
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleAddCard = () => {
    // Open full-screen card editor
    setEditingCard({
      front: '',
      back: '',
      difficulty: 'medium',
      cardType: 'basic',
      frontAlign: 'center',
      backAlign: 'center',
      frontVerticalAlign: 'middle',
      backVerticalAlign: 'middle',
      frontFontSize: '18',
      backFontSize: '18'
    });
    setEditingCardId(null); // Not editing an existing card
    setCardEditorMode(true);
    setIsFlipped(false);
    setShowPreview({ front: false, back: false });
    setDeckMode(null); // Reset mode when entering card editor
  };

  const handleEditCard = (card) => {
    // Pre-fill the editor with the card's data
    const frontContent = typeof card.front === 'string' ? card.front : (card.front?.content || '');
    const backContent = typeof card.back === 'string' ? card.back : (card.back?.content || '');
    const frontAlign = card.front?.align || 'center';
    const backAlign = card.back?.align || 'center';
    const frontVerticalAlign = card.front?.verticalAlign || 'middle';
    const backVerticalAlign = card.back?.verticalAlign || 'middle';
    const frontFontSize = card.front?.fontSize || '18';
    const backFontSize = card.back?.fontSize || '18';
    
    setEditingCard({
      front: frontContent,
      back: backContent,
      difficulty: card.difficulty || 'medium',
      cardType: 'basic', // Default to basic for editing
      frontAlign: frontAlign,
      backAlign: backAlign,
      frontVerticalAlign: frontVerticalAlign,
      backVerticalAlign: backVerticalAlign,
      frontFontSize: frontFontSize,
      backFontSize: backFontSize
    });
    setEditingCardId(card.id); // Track which card we're editing
    setCardEditorMode(true);
    setIsFlipped(false);
    setShowPreview({ front: false, back: false });
    // Keep deckMode as 'edit-cards' so we return to the table
  };

  const handleSaveCard = async (addMore = false, returnToTable = false) => {
    if (!editingCard.front.trim() || !editingCard.back.trim()) {
      alert('Please fill in both the front and back of the card');
      return;
    }

    try {
      setSavingCard(true);
      
      // Check if we're editing an existing card
      if (editingCardId) {
        // Update existing card
        await updateCard(editingCardId, deckId, {
          front: { content: editingCard.front.trim(), align: editingCard.frontAlign, verticalAlign: editingCard.frontVerticalAlign, fontSize: editingCard.frontFontSize || '18' },
          back: { content: editingCard.back.trim(), align: editingCard.backAlign, verticalAlign: editingCard.backVerticalAlign, fontSize: editingCard.backFontSize || '18' },
          difficulty: editingCard.difficulty
        });
        
        // Reload cards
        await loadDeckData();
        
        // Return to table if we came from edit mode
        if (returnToTable || deckMode === 'edit-cards') {
          setCardEditorMode(false);
          setEditingCardId(null);
          setDeckMode('edit-cards'); // Return to edit cards table
          setEditingCard({
            front: '',
            back: '',
            difficulty: 'medium',
            cardType: 'basic',
            frontAlign: 'center',
            backAlign: 'center',
            frontVerticalAlign: 'middle',
            backVerticalAlign: 'middle',
            frontFontSize: '18',
            backFontSize: '18'
          });
          setShowPreview({ front: false, back: false });
          return;
        }
      } else {
        // Creating new card(s)
        // Handle different card types
        if (editingCard.cardType === 'basic-reversed') {
          // Create two cards: original and reversed
          await Promise.all([
            addCard(deckId, {
              front: { content: editingCard.front.trim(), align: editingCard.frontAlign, verticalAlign: editingCard.frontVerticalAlign, fontSize: editingCard.frontFontSize || '18' },
              back: { content: editingCard.back.trim(), align: editingCard.backAlign, verticalAlign: editingCard.backVerticalAlign, fontSize: editingCard.backFontSize || '18' },
              difficulty: editingCard.difficulty
            }),
            addCard(deckId, {
              front: { content: editingCard.back.trim(), align: editingCard.backAlign, verticalAlign: editingCard.backVerticalAlign, fontSize: editingCard.backFontSize || '18' }, // Reversed: back becomes front
              back: { content: editingCard.front.trim(), align: editingCard.frontAlign, verticalAlign: editingCard.frontVerticalAlign, fontSize: editingCard.frontFontSize || '18' }, // Reversed: front becomes back
              difficulty: editingCard.difficulty
            })
          ]);
        } else {
          // Basic card type - single card
          await addCard(deckId, {
            front: { content: editingCard.front.trim(), align: editingCard.frontAlign, verticalAlign: editingCard.frontVerticalAlign, fontSize: editingCard.frontFontSize || '18' },
            back: { content: editingCard.back.trim(), align: editingCard.backAlign, verticalAlign: editingCard.backVerticalAlign, fontSize: editingCard.backFontSize || '18' },
            difficulty: editingCard.difficulty
          });
        }

        // Reload cards
        await loadDeckData();

        if (addMore) {
          // Reset for next card
          setEditingCard({
            front: '',
            back: '',
            difficulty: 'medium',
            cardType: editingCard.cardType, // Keep the same card type
            frontAlign: editingCard.frontAlign, // Keep alignment preferences
            backAlign: editingCard.backAlign,
            frontVerticalAlign: editingCard.frontVerticalAlign, // Keep vertical alignment preferences
            backVerticalAlign: editingCard.backVerticalAlign,
            frontFontSize: editingCard.frontFontSize || '18', // Keep font size preferences
            backFontSize: editingCard.backFontSize || '18'
          });
          setIsFlipped(false);
          setShowPreview({ front: false, back: false });
        } else {
          // Close editor
          setCardEditorMode(false);
          setEditingCard({
            front: '',
            back: '',
            difficulty: 'medium',
            cardType: 'basic',
            frontAlign: 'center',
            backAlign: 'center',
            frontVerticalAlign: 'middle',
            backVerticalAlign: 'middle',
            frontFontSize: '18',
            backFontSize: '18'
          });
          setShowPreview({ front: false, back: false });
        }
      }
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Failed to save card. Please try again.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleCancelCardEditor = () => {
    setCardEditorMode(false);
    setEditingCardId(null);
    setEditingCard({
      front: '',
      back: '',
      difficulty: 'medium',
      cardType: 'basic',
      frontAlign: 'center',
      backAlign: 'center',
      frontVerticalAlign: 'middle',
      backVerticalAlign: 'middle',
      frontFontSize: '18',
      backFontSize: '18'
    });
    setIsFlipped(false);
    setShowPreview({ front: false, back: false });
    setActiveTextarea('front');
    // If we were in edit-cards mode, return to it
    if (deckMode === 'edit-cards') {
      // Already in edit-cards mode, just close editor
    }
  };

  // Formatting helper functions
  const insertMarkdown = (side, syntax) => {
    const textarea = document.getElementById(`textarea-${side}`);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let newText, newCursorPos;

    if (selectedText) {
      // Wrap selected text
      if (syntax === 'bold') {
        newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
        newCursorPos = start + selectedText.length + 4;
      } else if (syntax === 'italic') {
        newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
        newCursorPos = start + selectedText.length + 2;
      } else if (syntax === 'code') {
        newText = text.substring(0, start) + '`' + selectedText + '`' + text.substring(end);
        newCursorPos = start + selectedText.length + 2;
      } else if (syntax === 'heading') {
        newText = text.substring(0, start) + `## ${selectedText}` + text.substring(end);
        newCursorPos = start + selectedText.length + 3;
      } else {
        newText = text;
        newCursorPos = start;
      }
    } else {
      // Insert syntax at cursor
      if (syntax === 'bold') {
        newText = text.substring(0, start) + '****' + text.substring(end);
        newCursorPos = start + 2;
      } else if (syntax === 'italic') {
        newText = text.substring(0, start) + '*' + text.substring(end);
        newCursorPos = start + 1;
      } else if (syntax === 'code') {
        newText = text.substring(0, start) + '`' + '`' + text.substring(end);
        newCursorPos = start + 1;
      } else if (syntax === 'heading') {
        newText = text.substring(0, start) + '## ' + text.substring(end);
        newCursorPos = start + 3;
      } else {
        newText = text;
        newCursorPos = start;
      }
    }

    // Update the card state
    setEditingCard({
      ...editingCard,
      [side]: newText
    });

    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const FormattingToolbar = ({ side }) => (
    <div className="flex items-center gap-1 sm:gap-2 p-2 bg-white/10 rounded-lg overflow-x-auto scrollbar-hide flex-nowrap sm:flex-wrap">
      <button
        onClick={() => insertMarkdown(side, 'bold')}
        className="px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition-colors flex items-center gap-1 text-xs sm:text-sm font-semibold whitespace-nowrap"
        title="Bold (Ctrl+B)"
      >
        <span className="material-icons text-sm sm:text-base">format_bold</span>
        <span className="hidden sm:inline">Bold</span>
      </button>
      <button
        onClick={() => insertMarkdown(side, 'italic')}
        className="px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition-colors flex items-center gap-1 text-xs sm:text-sm italic whitespace-nowrap"
        title="Italic (Ctrl+I)"
      >
        <span className="material-icons text-sm sm:text-base">format_italic</span>
        <span className="hidden sm:inline">Italic</span>
      </button>
      <button
        onClick={() => insertMarkdown(side, 'code')}
        className="px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition-colors flex items-center gap-1 text-xs sm:text-sm font-mono whitespace-nowrap"
        title="Code"
      >
        <span className="material-icons text-sm sm:text-base">code</span>
        <span className="hidden sm:inline">Code</span>
      </button>
      <button
        onClick={() => insertMarkdown(side, 'heading')}
        className="px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap"
        title="Heading"
      >
        <span className="material-icons text-sm sm:text-base">title</span>
        <span className="hidden sm:inline">Heading</span>
      </button>
      <div className="border-l border-white/30 h-6 mx-1"></div>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}Align`]: 'left' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}Align`] === 'left'
            ? 'bg-white/30 text-white'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Align Left"
      >
        <span className="material-icons text-sm sm:text-base">format_align_left</span>
        <span className="hidden sm:inline">Left</span>
      </button>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}Align`]: 'center' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}Align`] === 'center'
            ? 'bg-white/30 text-white'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Align Center"
      >
        <span className="material-icons text-sm sm:text-base">format_align_center</span>
        <span className="hidden sm:inline">Center</span>
      </button>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}Align`]: 'right' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}Align`] === 'right'
            ? 'bg-white/30 text-white'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Align Right"
      >
        <span className="material-icons text-sm sm:text-base">format_align_right</span>
        <span className="hidden sm:inline">Right</span>
      </button>
      <div className="border-l border-white/30 h-6 mx-1"></div>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}VerticalAlign`]: 'top' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}VerticalAlign`] === 'top'
            ? 'bg-white/30 text-white'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Align Top"
      >
        <span className="material-icons text-sm sm:text-base">vertical_align_top</span>
        <span className="hidden sm:inline">Top</span>
      </button>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}VerticalAlign`]: 'middle' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}VerticalAlign`] === 'middle'
            ? 'bg-white/30 text-white'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
        title="Align Middle"
      >
        <span className="material-icons text-sm sm:text-base">vertical_align_center</span>
        <span className="hidden sm:inline">Middle</span>
      </button>
      <div className="border-l border-white/30 h-6 mx-1"></div>
      <div className="flex items-center gap-1 px-1 sm:px-2 whitespace-nowrap">
        <span className="material-icons text-sm sm:text-base text-white">text_fields</span>
        <select
          value={editingCard[`${side}FontSize`] || '18'}
          onChange={(e) => setEditingCard({ ...editingCard, [`${side}FontSize`]: e.target.value })}
          className="bg-white/20 text-white rounded px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm focus:outline-none focus:bg-white/30 border border-white/30"
          title="Font Size"
        >
          <option value="12" className="bg-gray-800">12px</option>
          <option value="14" className="bg-gray-800">14px</option>
          <option value="16" className="bg-gray-800">16px</option>
          <option value="18" className="bg-gray-800">18px</option>
          <option value="20" className="bg-gray-800">20px</option>
          <option value="24" className="bg-gray-800">24px</option>
          <option value="28" className="bg-gray-800">28px</option>
          <option value="32" className="bg-gray-800">32px</option>
          <option value="36" className="bg-gray-800">36px</option>
        </select>
      </div>
    </div>
  );

  const FormattingToolbarBack = ({ side }) => (
    <div className="flex items-center gap-1 sm:gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-x-auto scrollbar-hide flex-nowrap sm:flex-wrap">
      <button
        onClick={() => insertMarkdown(side, 'bold')}
        className="px-2 sm:px-3 py-1.5 bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm font-semibold whitespace-nowrap"
        title="Bold (Ctrl+B)"
      >
        <span className="material-icons text-sm sm:text-base">format_bold</span>
        <span className="hidden sm:inline">Bold</span>
      </button>
      <button
        onClick={() => insertMarkdown(side, 'italic')}
        className="px-2 sm:px-3 py-1.5 bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm italic whitespace-nowrap"
        title="Italic (Ctrl+I)"
      >
        <span className="material-icons text-sm sm:text-base">format_italic</span>
        <span className="hidden sm:inline">Italic</span>
      </button>
      <button
        onClick={() => insertMarkdown(side, 'code')}
        className="px-2 sm:px-3 py-1.5 bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm font-mono whitespace-nowrap"
        title="Code"
      >
        <span className="material-icons text-sm sm:text-base">code</span>
        <span className="hidden sm:inline">Code</span>
      </button>
      <button
        onClick={() => insertMarkdown(side, 'heading')}
        className="px-2 sm:px-3 py-1.5 bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap"
        title="Heading"
      >
        <span className="material-icons text-sm sm:text-base">title</span>
        <span className="hidden sm:inline">Heading</span>
      </button>
      <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}Align`]: 'left' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}Align`] === 'left'
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
        }`}
        title="Align Left"
      >
        <span className="material-icons text-sm sm:text-base">format_align_left</span>
        <span className="hidden sm:inline">Left</span>
      </button>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}Align`]: 'center' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}Align`] === 'center'
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
        }`}
        title="Align Center"
      >
        <span className="material-icons text-sm sm:text-base">format_align_center</span>
        <span className="hidden sm:inline">Center</span>
      </button>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}Align`]: 'right' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}Align`] === 'right'
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
        }`}
        title="Align Right"
      >
        <span className="material-icons text-sm sm:text-base">format_align_right</span>
        <span className="hidden sm:inline">Right</span>
      </button>
      <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}VerticalAlign`]: 'top' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}VerticalAlign`] === 'top'
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
        }`}
        title="Align Top"
      >
        <span className="material-icons text-sm sm:text-base">vertical_align_top</span>
        <span className="hidden sm:inline">Top</span>
      </button>
      <button
        onClick={() => setEditingCard({ ...editingCard, [`${side}VerticalAlign`]: 'middle' })}
        className={`px-2 sm:px-3 py-1.5 rounded transition-colors flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap ${
          editingCard[`${side}VerticalAlign`] === 'middle'
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
            : 'bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
        }`}
        title="Align Middle"
      >
        <span className="material-icons text-sm sm:text-base">vertical_align_center</span>
        <span className="hidden sm:inline">Middle</span>
      </button>
      <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
      <div className="flex items-center gap-1 px-1 sm:px-2 whitespace-nowrap">
        <span className="material-icons text-sm sm:text-base text-gray-700 dark:text-gray-200">text_fields</span>
        <select
          value={editingCard[`${side}FontSize`] || '18'}
          onChange={(e) => setEditingCard({ ...editingCard, [`${side}FontSize`]: e.target.value })}
          className="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-500 border border-gray-300 dark:border-gray-500"
          title="Font Size"
        >
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
          <option value="32">32px</option>
          <option value="36">36px</option>
        </select>
      </div>
    </div>
  );

  const handleUpdateCard = async (cardId, field, value) => {
    try {
    const updatedCards = cards.map(card => {
        if (card.id == cardId) {
        if (field === 'front' || field === 'back') {
          return { ...card, [field]: { content: value } };
        }
        return { ...card, [field]: value };
      }
      return card;
    });
    setCards(updatedCards);
      
      // Find the card to update
      const cardToUpdate = updatedCards.find(c => c.id == cardId);
      if (cardToUpdate) {
        await updateCard(cardId, deckId, {
          front: cardToUpdate.front,
          back: cardToUpdate.back,
          difficulty: cardToUpdate.difficulty
        });
      }
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Failed to update card. Please try again.');
      await loadDeckData();
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        const updatedCards = cards.filter(card => card.id != cardId);
    setCards(updatedCards);
        await deleteCard(cardId, deckId);
      } catch (error) {
        console.error('Error deleting card:', error);
        alert('Failed to delete card. Please try again.');
        await loadDeckData();
      }
    }
  };

  const handleDeleteDeck = async () => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      try {
        await deleteDeck(deckId);
        navigate('/dashboard');
      } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Failed to delete deck. Please try again.');
      }
    }
  };

  const handleStartReview = () => {
    if (cards.length === 0) {
      alert('Add some cards first before starting a review!');
      return;
    }
    setDeckMode('practice');
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

  // Add error boundary state
  if (!deck && currentUser && deckId) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl mb-4 text-gray-900 dark:text-white">Loading deck...</div>
            <button 
              onClick={() => loadDeckData()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
        <div className="text-xl text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  // Full-screen card editor mode
  if (cardEditorMode) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
        <Navbar />
        <div className="flex-grow flex items-start justify-center p-4 sm:p-8 overflow-y-auto pt-16">
          <div className="w-full max-w-6xl">
            {/* Card Editor Header */}
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {editingCardId && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold">
                    <span className="material-icons text-base">edit</span>
                    Editing Card
                  </div>
                )}
                {!editingCardId && (
                  <>
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Card Type:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCard({ ...editingCard, cardType: 'basic' })}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                          editingCard.cardType === 'basic'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-semibold'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Basic
                      </button>
                      <button
                        onClick={() => setEditingCard({ ...editingCard, cardType: 'basic-reversed' })}
                        disabled={editingCardId !== null} // Disable reversed card option when editing
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                          editingCard.cardType === 'basic-reversed'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-semibold'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        } ${editingCardId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="hidden sm:inline">Basic (Reversed)</span>
                        <span className="sm:hidden">Reversed</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleCancelCardEditor}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white self-end sm:self-auto transition-colors"
                disabled={savingCard}
              >
                <span className="material-icons text-xl sm:text-2xl">close</span>
              </button>
            </div>

            {/* Card with Flip Animation */}
            <div className="card-editor-flip mb-6 h-[400px] sm:h-[600px]" style={{ perspective: '1000px' }}>
              <div 
                className="relative w-full h-full transition-transform duration-700"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front Side (Editable) */}
                <div 
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg)',
                    zIndex: !isFlipped ? 10 : 0
                  }}
                >
                  <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-lg shadow-2xl p-4 sm:p-8 h-full flex flex-col overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-4 gap-2">
                      <span className="text-xs sm:text-sm font-medium text-primary-100">FRONT SIDE</span>
                      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setShowPreview({ ...showPreview, front: !showPreview.front })}
                          className="bg-white/20 hover:bg-white/30 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                          title="Toggle preview"
                        >
                          <span className="material-icons text-sm sm:text-base">{showPreview.front ? 'edit' : 'visibility'}</span>
                          <span className="hidden sm:inline">{showPreview.front ? 'Edit' : 'Preview'}</span>
                        </button>
                        <button
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="bg-white/20 hover:bg-white/30 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                        >
                          <span className="material-icons text-sm sm:text-base">flip</span>
                          <span className="hidden sm:inline">Flip to Back</span>
                        </button>
                      </div>
                    </div>
                    {!showPreview.front && (
                      <div className="mb-3">
                        <FormattingToolbar side="front" />
                      </div>
                    )}
                    {showPreview.front ? (
                      <div className={`flex-grow bg-white/10 border-2 border-white/30 rounded-lg p-3 sm:p-6 text-white overflow-y-auto min-h-0 flex ${
                        editingCard.frontVerticalAlign === 'top' ? 'items-start' :
                        editingCard.frontVerticalAlign === 'bottom' ? 'items-end' : 'items-center'
                      } justify-center`}>
                        <div className={`w-full ${editingCard.frontAlign === 'center' ? 'text-center' : editingCard.frontAlign === 'right' ? 'text-right' : 'text-left'}`} style={{ fontSize: `${editingCard.frontFontSize || '18'}px` }}>
                          {editingCard.front ? (
                            <SimpleMarkdown text={editingCard.front} invert={true} />
                          ) : (
                            <p className="text-white/60 italic">No content yet</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow bg-white/10 border-2 border-white/30 rounded-lg overflow-hidden min-h-0">
                        <textarea
                          id="textarea-front"
                          value={editingCard.front}
                          onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                          onFocus={() => setActiveTextarea('front')}
                          placeholder="Enter the front of your card (question, word, etc.)"
                          className={`w-full h-full bg-transparent px-3 sm:px-6 pb-3 sm:pb-6 text-white placeholder-white/60 focus:outline-none resize-none ${
                            editingCard.frontAlign === 'center' ? 'text-center' : editingCard.frontAlign === 'right' ? 'text-right' : 'text-left'
                          }`}
                          style={{
                            boxSizing: 'border-box',
                            paddingTop: editingCard.frontVerticalAlign === 'top' ? '24px' :
                                      editingCard.frontVerticalAlign === 'bottom' ? '400px' : '200px',
                            fontSize: `${editingCard.frontFontSize || '18'}px`
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Back Side (Editable) */}
                <div 
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    zIndex: isFlipped ? 10 : 0
                  }}
                >
                  <div className="bg-white dark:bg-gray-800 border-4 border-primary-500 dark:border-primary-600 rounded-lg shadow-2xl p-4 sm:p-8 h-full flex flex-col overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-4 gap-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">BACK SIDE</span>
                      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setShowPreview({ ...showPreview, back: !showPreview.back })}
                          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                          title="Toggle preview"
                        >
                          <span className="material-icons text-sm sm:text-base">{showPreview.back ? 'edit' : 'visibility'}</span>
                          <span className="hidden sm:inline">{showPreview.back ? 'Edit' : 'Preview'}</span>
                        </button>
                        <button
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                        >
                          <span className="material-icons text-sm sm:text-base">flip</span>
                          <span className="hidden sm:inline">Flip to Front</span>
                        </button>
                      </div>
                    </div>
                    {!showPreview.back && (
                      <div className="mb-3">
                        <FormattingToolbarBack side="back" />
                      </div>
                    )}
                    {showPreview.back ? (
                      <div className={`flex-grow border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-6 text-gray-900 dark:text-white overflow-y-auto bg-gray-50 dark:bg-gray-700 min-h-0 flex ${
                        editingCard.backVerticalAlign === 'top' ? 'items-start' :
                        editingCard.backVerticalAlign === 'bottom' ? 'items-end' : 'items-center'
                      } justify-center`}>
                        <div className={`w-full ${editingCard.backAlign === 'center' ? 'text-center' : editingCard.backAlign === 'right' ? 'text-right' : 'text-left'}`} style={{ fontSize: `${editingCard.backFontSize || '18'}px` }}>
                          {editingCard.back ? (
                            <SimpleMarkdown text={editingCard.back} invert={false} />
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500 italic">No content yet</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden min-h-0">
                        <textarea
                          id="textarea-back"
                          value={editingCard.back}
                          onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                          onFocus={() => setActiveTextarea('back')}
                          placeholder="Enter the back of your card (answer, translation, etc.)"
                          className={`w-full h-full bg-transparent px-3 sm:px-6 pb-3 sm:pb-6 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none ${
                            editingCard.backAlign === 'center' ? 'text-center' : editingCard.backAlign === 'right' ? 'text-right' : 'text-left'
                          }`}
                          style={{
                            boxSizing: 'border-box',
                            paddingTop: editingCard.backVerticalAlign === 'top' ? '24px' :
                                       editingCard.backVerticalAlign === 'bottom' ? '400px' : '200px',
                            fontSize: `${editingCard.backFontSize || '18'}px`
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
              <button
                onClick={() => handleSaveCard(false, editingCardId !== null)}
                disabled={savingCard || !editingCard.front.trim() || !editingCard.back.trim()}
                className="btn-primary px-4 sm:px-8 py-2 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
              >
                {savingCard ? (
                  <>
                    <span className="material-icons animate-spin">refresh</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-icons">save</span>
                    Save Card
                  </>
                )}
              </button>
              <button
                onClick={() => handleSaveCard(true)}
                disabled={savingCard || !editingCard.front.trim() || !editingCard.back.trim()}
                className="btn-secondary px-4 sm:px-8 py-2 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
              >
                {savingCard ? (
                  <>
                    <span className="material-icons animate-spin">refresh</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-icons">add</span>
                    Save & Add More
                  </>
                )}
              </button>
              <button
                onClick={handleCancelCardEditor}
                disabled={savingCard}
                className="btn-secondary px-4 sm:px-8 py-2 sm:py-3 disabled:opacity-50 text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check - ensure deck exists before rendering
  if (!deck || !deck.name) {
    console.error('Deck is invalid:', deck);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl mb-4">Error loading deck</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      <Navbar />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-4 flex items-center gap-2 transition-colors"
            >
            <span className="material-icons">arrow_back</span>
            Back to Dashboard
            </button>
          
          <div className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-xl p-6 mb-6 border border-primary-200 dark:border-gray-600">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{deck.name}</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{deck.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-base">description</span>
                    {deck.cardCount || cards.length} cards
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-base">translate</span>
                    {deck.language}
                  </span>
        </div>
              </div>
              <div className="flex gap-2">
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

        </div>

        {/* Mode Selector - Main View */}
        {deckMode === null && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What would you like to do?</h2>
              <p className="text-gray-600 dark:text-gray-300">Choose an option to get started</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Add Cards */}
              <button
                onClick={handleAddCard}
                className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900 dark:to-primary-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left group border-2 border-primary-200 dark:border-primary-700"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-3 group-hover:from-primary-600 group-hover:to-primary-700 transition-all shadow-md">
                    <span className="material-icons text-white text-3xl">add_circle</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Cards</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">Create new flashcards for your deck</p>
              </button>

              {/* Edit Cards */}
              <button
                onClick={() => setDeckMode('edit-cards')}
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left group border-2 border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 group-hover:from-blue-600 group-hover:to-blue-700 transition-all shadow-md">
                    <span className="material-icons text-white text-3xl">edit</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Cards</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">Modify existing cards in your deck</p>
              </button>

              {/* Practice */}
              <button
                onClick={() => setDeckMode('practice')}
                className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left group border-2 border-green-200 dark:border-green-700"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 group-hover:from-green-600 group-hover:to-green-700 transition-all shadow-md">
                    <span className="material-icons text-white text-3xl">school</span>
            </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Practice</h3>
          </div>
                <p className="text-gray-600 dark:text-gray-300">Study your flashcards with spaced repetition</p>
                </button>

              {/* AI Suggestions */}
                      <button
                onClick={() => setDeckMode('ai-suggestions')}
                className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left group border-2 border-purple-200 dark:border-purple-700"
                      >
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 group-hover:from-purple-600 group-hover:to-purple-700 transition-all shadow-md">
                    <span className="material-icons text-white text-3xl">smart_toy</span>
                    </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Suggestions</h3>
                      </div>
                <p className="text-gray-600 dark:text-gray-300">Get AI-powered card recommendations</p>
              </button>

              {/* Game Modes */}
              <button
                onClick={() => setDeckMode('game-modes')}
                className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left group border-2 border-orange-200 dark:border-orange-700"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 group-hover:from-orange-600 group-hover:to-orange-700 transition-all shadow-md">
                    <span className="material-icons text-white text-3xl">sports_esports</span>
                      </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Game Modes</h3>
                    </div>
                <p className="text-gray-600 dark:text-gray-300">Learn through fun interactive games</p>
              </button>

              {/* Upload File */}
              <button
                onClick={() => setDeckMode('upload-file')}
                className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900 dark:to-teal-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-left group border-2 border-teal-200 dark:border-teal-700"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-3 group-hover:from-teal-600 group-hover:to-teal-700 transition-all shadow-md">
                    <span className="material-icons text-white text-3xl">upload_file</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload File</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">Create cards automatically from a file</p>
              </button>
                  </div>
          </div>
        )}

        {/* Edit Cards - Full Width Section */}
        {deckMode === 'edit-cards' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDeckMode(null)}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Back to options"
                >
                  <span className="material-icons text-2xl">arrow_back</span>
                </button>
                <h2 className="text-xl font-semibold dark:text-white">Edit Cards</h2>
              </div>
              <button onClick={handleAddCard} className="btn-primary flex items-center gap-2 w-full sm:w-auto">
                <span className="material-icons">add</span>
                Add New Card
              </button>
            </div>

            {loadingCards ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
                <span className="material-icons text-6xl text-gray-400 dark:text-gray-500 mb-4 animate-spin">refresh</span>
                <p className="text-gray-600 dark:text-gray-300">Loading cards...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
                <span className="material-icons text-6xl text-gray-400 dark:text-gray-500 mb-4">edit</span>
                <h3 className="text-xl font-semibold mb-2 dark:text-white">No cards to edit</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Add a card to start editing</p>
                <button onClick={handleAddCard} className="btn-primary">
                  Add Your First Card
                </button>
              </div>
            ) : (
              <div className="w-screen -mx-4 sm:-mx-6 lg:-mx-8 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-700 dark:to-primary-800">
                      <tr>
                        <th className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4 text-left text-sm font-medium text-white uppercase tracking-wider">#</th>
                        <th className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4 text-left text-sm font-medium text-white uppercase tracking-wider">Front</th>
                        <th className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4 text-left text-sm font-medium text-white uppercase tracking-wider">Back</th>
                        <th className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4 text-left text-sm font-medium text-white uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {cards.map((card, index) => {
                        const frontContent = typeof card.front === 'string' ? card.front : (card.front?.content || '');
                        const backContent = typeof card.back === 'string' ? card.back : (card.back?.content || '');
                        return (
                          <tr 
                            key={card.id} 
                            onClick={() => handleEditCard(card)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <td className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {index + 1}
                            </td>
                            <td className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4">
                              <div className="text-sm text-gray-900 dark:text-white max-w-none break-words">
                                {frontContent || <span className="text-gray-400 dark:text-gray-500 italic">Empty</span>}
                              </div>
                            </td>
                            <td className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4">
                              <div className="text-sm text-gray-700 dark:text-gray-300 max-w-none break-words">
                                {backContent || <span className="text-gray-400 dark:text-gray-500 italic">Empty</span>}
                              </div>
                            </td>
                            <td className="px-4 sm:px-8 lg:px-12 xl:px-16 py-4 whitespace-nowrap text-sm">
                      <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click when clicking delete
                                  handleDeleteCard(card.id);
                                }}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                title="Delete card"
                              >
                                <span className="material-icons">delete</span>
                      </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                    </div>
              </div>
            )}
          </div>
        )}

        {deckMode === 'practice' && (
          <div>
            {!reviewMode ? (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <button
                    onClick={() => { setDeckMode(null); setReviewMode(false); }}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title="Back to options"
                  >
                    <span className="material-icons text-2xl">arrow_back</span>
                  </button>
                  <h2 className="text-xl font-semibold dark:text-white">Choose a Study Mode</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Flashcard Mode */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer border border-gray-200 dark:border-gray-700" onClick={handleStartReview}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                        <span className="material-icons text-blue-600 dark:text-blue-400 text-3xl">style</span>
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white">Flashcard Review</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Review all cards in the deck, flip to see answers</p>
                  </div>

                  {/* Test Mode */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all opacity-75 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3">
                        <span className="material-icons text-green-600 dark:text-green-400 text-3xl">quiz</span>
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white">Test Mode</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Coming soon: Test your knowledge with typing</p>
                  </div>

                  {/* Match Mode */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all opacity-75 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-3">
                        <span className="material-icons text-purple-600 dark:text-purple-400 text-3xl">group_work</span>
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white">Match Game</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Coming soon: Match questions with answers</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Card {currentCardIndex + 1} of {cards.length}
                    </p>
                  </div>
                  
                  {cards && cards.length > 0 && cards[currentCardIndex] ? (
                  <Flashcard 
                    card={cards[currentCardIndex]}
                    isFlipped={isFlipped}
                    onFlip={handleFlip}
                  />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-300">No card available</p>
                      <button 
                        onClick={() => {
                          setReviewMode(false);
                          setDeckMode(null);
                        }}
                        className="btn-primary mt-4"
                      >
                        Back to Options
                      </button>
                    </div>
                  )}

                  {cards && cards.length > 0 && cards[currentCardIndex] && (
                  <div className="mt-8 flex justify-center gap-4">
                    <button
                      onClick={() => handleAnswer('hard')}
                      className="px-6 py-3 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons">sentiment_very_dissatisfied</span>
                      Hard
                    </button>
                    <button
                      onClick={() => handleAnswer('medium')}
                      className="px-6 py-3 bg-yellow-500 dark:bg-yellow-600 text-white rounded-lg hover:bg-yellow-600 dark:hover:bg-yellow-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons">sentiment_neutral</span>
                      Unknown
                    </button>
                    <button
                      onClick={() => handleAnswer('easy')}
                      className="px-6 py-3 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons">sentiment_very_satisfied</span>
                      Known
                    </button>
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {deckMode === 'ai-suggestions' && (
          <AISuggestionsView 
            deckId={deckId} 
            deck={deck} 
            onBack={() => setDeckMode(null)}
            onAddCard={handleAddCard}
            onCardAdded={loadDeckData}
          />
        )}

        {deckMode === 'game-modes' && (
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setDeckMode(null)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Back to options"
              >
                <span className="material-icons text-2xl">arrow_back</span>
              </button>
              <h2 className="text-xl font-semibold dark:text-white">Game Modes</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
              <span className="material-icons text-6xl text-orange-400 dark:text-orange-500 mb-4">sports_esports</span>
              <h3 className="text-2xl font-semibold mb-2 dark:text-white">Game Modes Coming Soon!</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Learn through fun interactive games</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Multiple game modes will be available soon to make learning more engaging</p>
            </div>
          </div>
        )}

        {deckMode === 'upload-file' && (
          <div>
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setDeckMode(null)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Back to options"
              >
                <span className="material-icons text-2xl">arrow_back</span>
              </button>
              <h2 className="text-xl font-semibold dark:text-white">Upload File</h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
              <span className="material-icons text-6xl text-teal-400 dark:text-teal-500 mb-4">upload_file</span>
              <h3 className="text-2xl font-semibold mb-2 dark:text-white">File Upload Coming Soon!</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Upload a file and automatically generate flashcards from its content</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">This feature will allow you to upload documents, PDFs, or text files and have cards created automatically based on the content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// AI Suggestions View Component
const AISuggestionsView = ({ deckId, deck, onBack, onCardAdded }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingCards, setAddingCards] = useState({});

  const handleGetSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const results = await getAISuggestions(deckId, 5);
      setSuggestions(results);
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setError(err.message || 'Failed to get AI suggestions. Make sure GITHUB_TOKEN is set in your server .env file.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestedCard = async (suggestion, index) => {
    try {
      setAddingCards({ ...addingCards, [index]: true });
      
      // Open card editor with pre-filled data
      const cardEditor = {
        front: suggestion.front,
        back: suggestion.back,
        difficulty: 'medium',
        cardType: 'basic',
        frontAlign: 'center',
        backAlign: 'center',
        frontVerticalAlign: 'middle',
        backVerticalAlign: 'middle',
        frontFontSize: '18',
        backFontSize: '18'
      };
      
      // We'll need to modify the parent component's state, so let's use a callback
      // For now, let's directly add the card via API
      await addCard(deckId, {
        front: { content: suggestion.front, align: 'center', verticalAlign: 'middle', fontSize: '18' },
        back: { content: suggestion.back, align: 'center', verticalAlign: 'middle', fontSize: '18' },
        difficulty: 'medium'
      });
      
      // Remove from suggestions
      setSuggestions(suggestions.filter((_, i) => i !== index));
      
      // Reload deck data
      if (onCardAdded) {
        await onCardAdded();
      }
    } catch (err) {
      console.error('Error adding suggested card:', err);
      alert('Failed to add card. Please try again.');
    } finally {
      setAddingCards({ ...addingCards, [index]: false });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Back to options"
        >
          <span className="material-icons text-2xl">arrow_back</span>
        </button>
        <h2 className="text-xl font-semibold dark:text-white">AI Suggestions</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Get AI-Powered Card Suggestions</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              AI will analyze your deck "{deck?.name}" ({deck?.language}) and suggest relevant flashcards.
            </p>
          </div>
          <button
            onClick={handleGetSuggestions}
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-6 py-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-icons animate-spin">refresh</span>
                Generating...
              </>
            ) : (
              <>
                <span className="material-icons">smart_toy</span>
                Get Suggestions
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <span className="material-icons">error</span>
              <p className="font-medium">Error: {error}</p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              Make sure your server has GITHUB_TOKEN set in the .env file. You can get a GitHub token from:
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                GitHub Settings → Developer settings → Personal access tokens
              </a>
            </p>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Suggested Cards ({suggestions.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Front</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{suggestion.front}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Back</p>
                    <p className="text-gray-700 dark:text-gray-300">{suggestion.back}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddSuggestedCard(suggestion, index)}
                    disabled={addingCards[index]}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
                  >
                    {addingCards[index] ? (
                      <>
                        <span className="material-icons animate-spin text-base">refresh</span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <span className="material-icons text-base">add</span>
                        Add to Deck
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSuggestions(suggestions.filter((_, i) => i !== index))}
                    className="btn-secondary px-4 py-2"
                    title="Dismiss"
                  >
                    <span className="material-icons text-base">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && !loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
          <span className="material-icons text-6xl text-purple-400 dark:text-purple-500 mb-4">smart_toy</span>
          <h3 className="text-xl font-semibold mb-2 dark:text-white">Get Started with AI Suggestions</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Click "Get Suggestions" to receive AI-powered flashcard recommendations based on your deck
          </p>
        </div>
      )}
    </div>
  );
};

export default DeckPage;
