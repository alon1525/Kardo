// Sample mock data for decks and flashcards

export const sampleDecks = [
  {
    id: '1',
    name: 'Spanish Basics',
    description: 'Essential Spanish words and phrases',
    language: 'Spanish',
    cardCount: 20,
    createdAt: new Date().toISOString(),
    cards: [
      { id: '1', front: 'Hello', back: 'Hola', difficulty: 'easy' },
      { id: '2', front: 'Goodbye', back: 'Adiós', difficulty: 'easy' },
      { id: '3', front: 'Thank you', back: 'Gracias', difficulty: 'easy' },
      { id: '4', front: 'Please', back: 'Por favor', difficulty: 'easy' },
      { id: '5', front: 'Yes', back: 'Sí', difficulty: 'easy' },
      { id: '6', front: 'No', back: 'No', difficulty: 'easy' },
      { id: '7', front: 'Water', back: 'Agua', difficulty: 'medium' },
      { id: '8', front: 'Food', back: 'Comida', difficulty: 'medium' },
      { id: '9', front: 'Friend', back: 'Amigo', difficulty: 'medium' },
      { id: '10', front: 'House', back: 'Casa', difficulty: 'medium' },
      { id: '11', front: 'Good morning', back: 'Buenos días', difficulty: 'medium' },
      { id: '12', front: 'Good evening', back: 'Buenas noches', difficulty: 'medium' },
      { id: '13', front: 'How are you?', back: '¿Cómo estás?', difficulty: 'medium' },
      { id: '14', front: 'I am fine', back: 'Estoy bien', difficulty: 'hard' },
      { id: '15', front: 'What is your name?', back: '¿Cuál es tu nombre?', difficulty: 'hard' },
      { id: '16', front: 'Nice to meet you', back: 'Mucho gusto', difficulty: 'hard' },
      { id: '17', front: 'I love you', back: 'Te amo', difficulty: 'hard' },
      { id: '18', front: 'Beautiful', back: 'Hermoso', difficulty: 'hard' },
      { id: '19', front: 'See you later', back: 'Hasta luego', difficulty: 'hard' },
      { id: '20', front: 'Excuse me', back: 'Disculpe', difficulty: 'medium' }
    ]
  },
  {
    id: '2',
    name: 'French Essentials',
    description: 'Common French vocabulary',
    language: 'French',
    cardCount: 15,
    createdAt: new Date().toISOString(),
    cards: [
      { id: '1', front: 'Hello', back: 'Bonjour', difficulty: 'easy' },
      { id: '2', front: 'Goodbye', back: 'Au revoir', difficulty: 'easy' },
      { id: '3', front: 'Thank you', back: 'Merci', difficulty: 'easy' },
      { id: '4', front: 'Please', back: 'S\'il vous plaît', difficulty: 'easy' },
      { id: '5', front: 'Yes', back: 'Oui', difficulty: 'easy' },
      { id: '6', front: 'No', back: 'Non', difficulty: 'easy' },
      { id: '7', front: 'Water', back: 'Eau', difficulty: 'medium' },
      { id: '8', front: 'Bread', back: 'Pain', difficulty: 'medium' },
      { id: '9', front: 'Friend', back: 'Ami', difficulty: 'medium' },
      { id: '10', front: 'House', back: 'Maison', difficulty: 'medium' },
      { id: '11', front: 'Good night', back: 'Bonne nuit', difficulty: 'medium' },
      { id: '12', front: 'How are you?', back: 'Comment allez-vous?', difficulty: 'medium' },
      { id: '13', front: 'I love you', back: 'Je t\'aime', difficulty: 'hard' },
      { id: '14', front: 'Beautiful', back: 'Beau', difficulty: 'hard' },
      { id: '15', front: 'Good luck', back: 'Bonne chance', difficulty: 'hard' }
    ]
  },
  {
    id: '3',
    name: 'Japanese Phrases',
    description: 'Basic Japanese conversation',
    language: 'Japanese',
    cardCount: 18,
    createdAt: new Date().toISOString(),
    cards: [
      { id: '1', front: 'Hello', back: 'こんにちは (Konnichiwa)', difficulty: 'easy' },
      { id: '2', front: 'Goodbye', back: 'さようなら (Sayonara)', difficulty: 'easy' },
      { id: '3', front: 'Thank you', back: 'ありがとう (Arigatou)', difficulty: 'easy' },
      { id: '4', front: 'Please', back: 'お願いします (Onegaishimasu)', difficulty: 'easy' },
      { id: '5', front: 'Yes', back: 'はい (Hai)', difficulty: 'easy' },
      { id: '6', front: 'No', back: 'いいえ (Iie)', difficulty: 'easy' },
      { id: '7', front: 'Water', back: '水 (Mizu)', difficulty: 'medium' },
      { id: '8', front: 'Rice', back: 'ご飯 (Gohan)', difficulty: 'medium' },
      { id: '9', front: 'Friend', back: '友達 (Tomodachi)', difficulty: 'medium' },
      { id: '10', front: 'Good morning', back: 'おはよう (Ohayou)', difficulty: 'medium' },
      { id: '11', front: 'Good evening', back: 'こんばんは (Konbanwa)', difficulty: 'medium' },
      { id: '12', front: 'I\'m sorry', back: 'すみません (Sumimasen)', difficulty: 'medium' },
      { id: '13', front: 'How are you?', back: 'お元気ですか? (Ogenki desu ka?)', difficulty: 'hard' },
      { id: '14', front: 'I love you', back: '愛してる (Aishiteru)', difficulty: 'hard' },
      { id: '15', front: 'Beautiful', back: '美しい (Utsukushii)', difficulty: 'hard' },
      { id: '16', front: 'See you later', back: 'またね (Mata ne)', difficulty: 'hard' },
      { id: '17', front: 'Welcome', back: 'いらっしゃいませ (Irasshaimase)', difficulty: 'hard' },
      { id: '18', front: 'Good luck', back: '頑張って (Ganbatte)', difficulty: 'hard' }
    ]
  }
];

