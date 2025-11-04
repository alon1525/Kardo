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

2. Edit `.env` with your database credentials and GitHub token:
```env
DATABASE_URL=postgresql://postgres:your_password@db.yourproject.supabase.co:5432/postgres
PORT=5000
GITHUB_TOKEN=your_github_personal_access_token_here
```

**To get your Supabase connection string:**
- Go to your Supabase project dashboard
- Navigate to Settings → Database
- Copy the "Connection string" under "Connection parameters"
- Replace `[YOUR-PASSWORD]` with your database password

**To get your GitHub token for AI Suggestions:**
- Go to https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Give it a name (e.g., "Kardo AI")
- Select scopes: `read:packages` (minimum required)
- Copy the token and add it to `.env` as `GITHUB_TOKEN`

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

### AI Features
- `POST /api/decks/:deckId/ai-suggestions` - Get AI suggestions for cards
- `POST /api/cards/explain` - Get AI explanation for a card

### Progress & Stats
- `GET /api/progress/:userId` - Get progress
- `POST /api/progress` - Record progress
- `GET /api/stats/:userId` - Get stats
- `PUT /api/stats/:userId` - Update stats

## Database

Uses PostgreSQL via Supabase. Make sure your Supabase project is set up and running.

See `../database/migration.sql` for schema setup.

## AI Features

The server includes AI-powered suggestions using GitHub's Llama model:
- **AI Suggestions**: Get intelligent flashcard recommendations based on your deck
- **Card Explanations**: Get AI explanations for cards

To enable AI features, set `GITHUB_TOKEN` in your `.env` file. Get a token from:
https://github.com/settings/tokens

## Dependencies

- **express**: Web framework
- **pg**: PostgreSQL driver
- **postgres**: Postgres.js (alternative PostgreSQL client)
- **@azure-rest/ai-inference**: Azure AI inference client for GitHub models
- **@azure/core-auth**: Azure authentication
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management




