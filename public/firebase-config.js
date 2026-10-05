// ==============================================================================
// FIREBASE CONFIGURATION FOR FRIENDS LIBRARY
// ==============================================================================
// To enable Real Free SMS OTP via Google Firebase:
// 1. Visit: https://console.firebase.google.com
// 2. Create a Free Project -> Enable "Phone" sign-in under Authentication
// 3. Register a Web App (</>) and copy-paste your config values below:
// ==============================================================================

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Check if user has entered real keys
const isFirebaseReady = typeof firebase !== 'undefined' && 
    firebaseConfig.apiKey !== "YOUR_API_KEY" && 
    firebaseConfig.apiKey.length > 10;

if (isFirebaseReady) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("[Firebase] Successfully initialized Firebase Authentication.");
    } catch (e) {
        console.error("[Firebase] Initialization error:", e);
    }
} else {
    console.warn("[Firebase] Setup pending. Replace placeholders in public/firebase-config.js with your Firebase Console credentials.");
}
