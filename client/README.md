# LingoCards Client (Frontend)

React-based frontend application for the language learning flashcard platform.

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at http://localhost:5173

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Configuration

1. **Firebase**: Update `src/firebase/firebaseConfig.js` with your Firebase credentials
2. **API Base URL**: Backend runs on http://localhost:5000 by default

## Project Structure

```
client/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── context/        # React Context (Auth)
│   ├── firebase/       # Firebase config
│   ├── utils/          # Utilities
│   └── data/           # Sample data
├── public/             # Static files
└── index.html          # Entry HTML
```

## Features

- React 18 with Hooks
- React Router for navigation
- Tailwind CSS for styling
- Firebase Authentication
- Responsive design
- Flashcard flip animations
- Web Speech API integration



