# Setup Steps for Kardo

## Step 1: Database Setup

Run these SQL files in Supabase SQL Editor in order:

### 1. `database/migration.sql`
Creates the tables with UUID support

### 2. `database/trigger.sql`  
Creates a trigger that automatically adds users to the `users` table when they sign up

## Step 2: Start the App

```bash
# Terminal 1 - Server
cd server
npm start

# Terminal 2 - Client  
cd client
npm run dev
```

## How it works:

1. When a user signs up, Supabase Auth creates them in `auth.users`
2. The trigger automatically inserts them into your `public.users` table
3. The server API works with the JSONB cards structure
4. Cards have `front` and `back` objects with `content` property

## Card Structure:
```json
{
  "id": 1234567890,
  "front": {
    "content": "Hello"
  },
  "back": {
    "content": "Hola"
  },
  "difficulty": "medium"
}
```
