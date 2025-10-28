# LingoCards Server (Backend)

Node.js/Express backend API for the language learning flashcard platform.

## Getting Started

### Installation

```bash
npm install
```

### Configuration

1. Copy the environment file:
```bash
copy env.example .env
```

2. Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=flashcards_db
PORT=5000
```

### Development

```bash
npm run dev
```

Requires nodemon to be installed globally or locally.

### Production

```bash
npm start
```

## API Endpoints

### Decks
- `GET /api/decks/:userId` - Get all decks
- `POST /api/decks` - Create deck
- `PUT /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck

### Cards
- `GET /api/decks/:deckId/cards` - Get cards
- `POST /api/decks/:deckId/cards` - Add card
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card

### Progress & Stats
- `GET /api/progress/:userId` - Get progress
- `POST /api/progress` - Record progress
- `GET /api/stats/:userId` - Get stats
- `PUT /api/stats/:userId` - Update stats

## Database

Uses MySQL. Make sure the database is created and running.

See `../database/schema.sql` for schema setup.

## Dependencies

- **express**: Web framework
- **mysql2**: MySQL driver
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management



