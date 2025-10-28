# 🚀 Start Here - LingoCards

## ⚠️ IMPORTANT: Install Node.js First!

You're getting "npm is not recognized" because Node.js is not installed.

### Quick Fix (5 minutes):

1. **Download Node.js**: https://nodejs.org/
   - Click "Download Node.js (LTS)" 
   - Install the `.msi` file
   
2. **Restart your terminal** (close and reopen PowerShell)

3. **Verify it worked**:
   ```powershell
   node --version
   npm --version
   ```

## 📖 Next Steps

After Node.js is installed, follow these steps:

### Quick Start:
```powershell
# 1. Install frontend dependencies
cd client
npm install

# 2. Install backend dependencies
cd ..\server
npm install

# 3. Setup database
cd ..
mysql -u root -p < database\schema.sql

# 4. Configure Firebase (see README.md)

# 5. Start frontend (Terminal 1)
cd client
npm run dev

# 6. Start backend (Terminal 2)
cd server
npm start
```

## 📚 Full Documentation

- **README.md** - Complete project documentation
- **INSTALL.md** - Detailed installation guide
- **SQL_COMMANDS.md** - Database reference

## 🎯 What You're Building

A full-stack language learning flashcard platform with:
- ✅ React frontend
- ✅ Node.js/Express backend
- ✅ MySQL database
- ✅ Firebase authentication
- ✅ Flashcard review system
- ✅ Progress tracking
- ✅ Responsive design

## ✨ Features

- Create custom flashcard decks
- Study with flip animations
- Track your progress
- Audio pronunciation
- Beautiful modern UI

## 🆘 Need Help?

Check the **INSTALL.md** file for detailed troubleshooting!

Good luck! 🎉



