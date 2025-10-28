# SQL Database Commands

## Quick Setup - Run This in MySQL

```bash
# Step 1: Login to MySQL
mysql -u root -p

# Step 2: Run the schema file
source database/schema.sql;

# OR if you're already in MySQL:
source /path/to/project/database/schema.sql;
```

## Complete SQL Schema

### 1. Create Database
```sql
CREATE DATABASE IF NOT EXISTS flashcards_db;
USE flashcards_db;
```

### 2. Create Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Create Decks Table
```sql
CREATE TABLE IF NOT EXISTS decks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(100) NOT NULL DEFAULT 'English',
    card_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_language (language),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. Create Cards Table
```sql
CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deck_id INT NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
    INDEX idx_deck_id (deck_id),
    INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. Create Study Progress Table
```sql
CREATE TABLE IF NOT EXISTS study_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    card_id INT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard'),
    date_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    times_reviewed INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_card (user_id, card_id),
    INDEX idx_user_id (user_id),
    INDEX idx_card_id (card_id),
    INDEX idx_date_reviewed (date_reviewed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. Create User Stats Table
```sql
CREATE TABLE IF NOT EXISTS user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    cards_studied_today INT DEFAULT 0,
    streak INT DEFAULT 0,
    last_study_date DATE,
    total_cards_studied INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_last_study_date (last_study_date),
    INDEX idx_streak (streak)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7. Create Popular Decks Table (Optional)
```sql
CREATE TABLE IF NOT EXISTS popular_decks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(100) NOT NULL,
    card_count INT DEFAULT 0,
    times_imported INT DEFAULT 0,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_language (language),
    INDEX idx_times_imported (times_imported DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Common SQL Queries

### Check if database exists
```sql
SHOW DATABASES LIKE 'flashcards_db';
```

### Show all tables
```sql
USE flashcards_db;
SHOW TABLES;
```

### View table structure
```sql
DESCRIBE users;
DESCRIBE decks;
DESCRIBE cards;
```

### Count records
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM decks;
SELECT COUNT(*) FROM cards;
```

### View sample data
```sql
SELECT * FROM users LIMIT 5;
SELECT * FROM decks LIMIT 5;
SELECT * FROM cards LIMIT 5;
```

### Drop database (if you need to reset)
```sql
DROP DATABASE IF EXISTS flashcards_db;
```

### View all decks for a user
```sql
SELECT d.*, COUNT(c.id) as card_count
FROM decks d
LEFT JOIN cards c ON d.id = c.deck_id
WHERE d.user_id = 'your_user_id'
GROUP BY d.id;
```

### View all cards in a deck
```sql
SELECT * FROM cards
WHERE deck_id = 1
ORDER BY id;
```

## Reset Database

If you want to completely reset the database:

```sql
-- Drop all tables
DROP TABLE IF EXISTS study_progress;
DROP TABLE IF EXISTS user_stats;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS decks;
DROP TABLE IF EXISTS popular_decks;
DROP TABLE IF EXISTS users;

-- Then run the CREATE TABLE commands again
```

## Backup Database

```bash
# Backup
mysqldump -u root -p flashcards_db > backup.sql

# Restore
mysql -u root -p flashcards_db < backup.sql
```

## One-Line Command to Build Database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS flashcards_db; USE flashcards_db; SOURCE database/schema.sql;"
```

Or:

```bash
mysql -u root -p < database/schema.sql
```



