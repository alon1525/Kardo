# Installation Guide

## Prerequisites

Before installing, you need:

1. **Node.js** (includes npm)
   - Download: https://nodejs.org/
   - Install latest LTS version
   - Restart terminal after installation

2. **MySQL**
   - Download: https://dev.mysql.com/downloads/
   - Install and start the service

## Installation Steps

### 1. Install Node.js

**Windows:**
1. Download the installer from https://nodejs.org/
2. Run the `.msi` file
3. Follow the setup wizard
4. **Restart your terminal/PowerShell**

Verify installation:
```powershell
node --version
npm --version
```

If you see version numbers, Node.js is installed correctly!

### 2. Install Frontend Dependencies

```powershell
cd client
npm install
```

### 3. Install Backend Dependencies

```powershell
cd ..\server
npm install
```

### 4. Setup Database

```powershell
# From project root
mysql -u root -p < database\schema.sql
```

### 5. Configure Backend

Copy the example environment file and edit it:
```powershell
cd server
copy env.example .env
notepad .env
```

Edit these values:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=flashcards_db
PORT=5000
```

### 6. Configure Firebase

1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable Authentication → Email/Password
4. Copy your config
5. Open `client\src\firebase\firebaseConfig.js`
6. Replace the placeholder values

### 7. Run the Application

**Terminal 1 - Frontend:**
```powershell
cd client
npm run dev
```
Opens at: http://localhost:5173

**Terminal 2 - Backend:**
```powershell
cd server
npm start
```
API at: http://localhost:5000

## Troubleshooting

### "npm is not recognized"
**Problem**: Node.js not installed or terminal not restarted
**Solution**: 
1. Install Node.js from https://nodejs.org/
2. Close and reopen terminal
3. Run `node --version` to verify

### "mysql is not recognized"
**Problem**: MySQL not installed or not in PATH
**Solution**: 
1. Install MySQL from https://dev.mysql.com/downloads/
2. Add MySQL to your system PATH
3. Or use MySQL Workbench for database setup

### Port 5173 already in use
**Solution**: 
- Close other applications using that port
- Or change port in `client\vite.config.js`

### Database connection failed
**Solution**:
- Check MySQL is running
- Verify credentials in `server\.env`
- Test: `mysql -u root -p`

## Quick Start Commands Summary

```powershell
# Install Node.js from https://nodejs.org/ first!

# Install dependencies
cd client
npm install
cd ..\server
npm install

# Setup database
mysql -u root -p < database\schema.sql

# Start frontend
cd client
npm run dev

# Start backend (in new terminal)
cd server
npm start
```

## Need Help?

1. Make sure Node.js is installed and terminal is restarted
2. Check all dependencies are installed
3. Verify database is running
4. Check environment variables are set correctly
5. Look at error messages carefully

Good luck! 🚀



