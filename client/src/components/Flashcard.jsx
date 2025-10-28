/**
 * Flashcard component with flip animation
 */
const Flashcard = ({ card, isFlipped, onFlip }) => {
  const handleListen = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(card.back);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis not supported in this browser');
    }
  };

  return (
    <div className="card-flip">
      <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Front of card */}
        <div className="card-flip-front">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-lg shadow-lg p-12 cursor-pointer"
               onClick={onFlip}
               style={{ minHeight: '300px' }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-2xl font-semibold text-center mb-4">{card.front}</p>
              <p className="text-sm text-primary-100">Click to flip</p>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div className="card-flip-back">
          <div className="bg-white border-4 border-primary-500 rounded-lg shadow-lg p-12 cursor-pointer relative"
               onClick={onFlip}
               style={{ minHeight: '300px' }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-3xl font-bold text-gray-900 text-center mb-4">{card.back}</p>
              <p className="text-sm text-gray-500 mb-4">Click to flip back</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleListen();
                }}
                className="btn-primary mt-2 flex items-center gap-2"
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

