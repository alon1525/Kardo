// Firebase configuration file
// IMPORTANT: Replace these with your actual Firebase credentials
// Get them from: https://console.firebase.google.com

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// TODO: Get your Firebase config from https://console.firebase.google.com
// 1. Create a project or select existing one
// 2. Go to Project Settings (gear icon)
// 3. Under "Your apps", click the web icon</> or create a web app
// 4. Copy the config object and replace the values below

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Temporarily using a demo key - REPLACE THIS WITH YOUR ACTUAL CONFIG
const tempConfig = {
  apiKey: "demo-key-placeholder",
  authDomain: "kardo-flashcards.firebaseapp.com",
  projectId: "kardo-flashcards",
  storageBucket: "kardo-flashcards.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Use the temporary config - you MUST replace this!
const configToUse = firebaseConfig.apiKey === "YOUR_API_KEY" ? tempConfig : firebaseConfig;

// Initialize Firebase
const app = initializeApp(configToUse);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;

// Quick setup instructions:
// 1. Go to https://console.firebase.google.com
// 2. Click "Add project" or select existing
// 3. Follow the setup wizard
// 4. In the project dashboard, click the gear icon → Project Settings
// 5. Scroll to "Your apps" section, click the web icon </>
// 6. Register your app with a nickname
// 7. Copy the firebaseConfig object
// 8. Replace the firebaseConfig values above with your real config
// 9. Also enable Authentication: Authentication → Get Started → Email/Password → Enable → Save

