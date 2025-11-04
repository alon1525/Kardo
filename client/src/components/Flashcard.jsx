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
 * Flashcard component with flip animation
 */
const Flashcard = ({ card, isFlipped, onFlip }) => {
  // Extract content from card object (handles both formats)
  // Always ensure we get a string, never render objects
  let frontContent = 'Empty';
  let backContent = 'Empty';
  
  if (card) {
    if (typeof card.front === 'string') {
      frontContent = card.front;
    } else if (card.front && typeof card.front === 'object') {
      frontContent = card.front.content || card.front.text || 'Empty';
    }
    
    if (typeof card.back === 'string') {
      backContent = card.back;
    } else if (card.back && typeof card.back === 'object') {
      backContent = card.back.content || card.back.text || 'Empty';
    }
  }
  
  // Get alignment (default to center/middle if not specified)
  const frontAlign = card?.front?.align || 'center';
  const backAlign = card?.back?.align || 'center';
  const frontVerticalAlign = card?.front?.verticalAlign || 'middle';
  const backVerticalAlign = card?.back?.verticalAlign || 'middle';
  const frontFontSize = card?.front?.fontSize || '18';
  const backFontSize = card?.back?.fontSize || '18';

  const handleListen = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(backContent);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis not supported in this browser');
    }
  };

  if (!card) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <p className="text-gray-600">No card available</p>
      </div>
    );
  }

  return (
    <div className="card-flip">
      <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Front of card */}
        <div className="card-flip-front">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-lg shadow-lg p-6 sm:p-12 cursor-pointer min-h-[200px] sm:min-h-[300px]"
               onClick={onFlip}
          >
            <div className={`flex flex-col h-full w-full px-4 ${
              frontVerticalAlign === 'top' ? 'justify-start' :
              frontVerticalAlign === 'bottom' ? 'justify-end' : 'justify-center'
            }`}>
              <div className={`font-semibold mb-4 max-w-full w-full ${
                frontAlign === 'center' ? 'text-center' : 
                frontAlign === 'right' ? 'text-right' : 'text-left'
              }`} style={{ fontSize: `${frontFontSize}px` }}>
                <SimpleMarkdown text={frontContent} invert={true} />
              </div>
              <p className="text-sm text-primary-100 text-center">Click to flip</p>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div className="card-flip-back">
          <div className="bg-white border-4 border-primary-500 rounded-lg shadow-lg p-6 sm:p-12 cursor-pointer relative min-h-[200px] sm:min-h-[300px]"
               onClick={onFlip}
          >
            <div className={`flex flex-col h-full w-full px-4 ${
              backVerticalAlign === 'top' ? 'justify-start' :
              backVerticalAlign === 'bottom' ? 'justify-end' : 'justify-center'
            }`}>
              <div className={`font-bold text-gray-900 mb-4 max-w-full w-full ${
                backAlign === 'center' ? 'text-center' : 
                backAlign === 'right' ? 'text-right' : 'text-left'
              }`} style={{ fontSize: `${backFontSize}px` }}>
                <SimpleMarkdown text={backContent} invert={false} />
              </div>
              <p className="text-sm text-gray-500 mb-4 text-center">Click to flip back</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleListen();
                }}
                className="btn-primary mt-2 flex items-center gap-2 self-center"
              >
                <span className="material-icons">volume_up</span>
                Listen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;

