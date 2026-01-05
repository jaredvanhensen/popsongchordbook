// Firebase Configuration
// 
// INSTRUCTIES:
// 1. Ga naar https://console.firebase.google.com/
// 2. Maak een nieuw project aan of selecteer een bestaand project
// 3. Ga naar Project Settings (⚙️) > General tab
// 4. Scroll naar "Your apps" en klik op het web icoon (</>)
// 5. Registreer je app (geef een naam op)
// 6. Kopieer de Firebase configuratie object
// 7. Vervang de onderstaande placeholder waarden met je eigen Firebase config
//
// RECAPTCHA SITE KEY VOOR APP CHECK:
// 1. Ga naar Firebase Console > App Check
// 2. Klik op "Apps" en selecteer je web app
// 3. Klik op "reCAPTCHA v3" provider (of maak deze aan als die nog niet bestaat)
// 4. Kopieer de "Site key" die wordt getoond
// 5. Vervang "JOUW_RECAPTCHA_SITE_KEY" hieronder met deze site key

// Firebase configuratie object (gebruikt met Firebase Compat SDK)
const firebaseConfig = {
  apiKey: "AIzaSyDaDli2YxzH4uXMilbRLDIByAG9AAGHcjo",
  authDomain: "popsongchordbook-jared.firebaseapp.com",
  databaseURL: "https://popsongchordbook-jared-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "popsongchordbook-jared",
  storageBucket: "popsongchordbook-jared.firebasestorage.app",
  messagingSenderId: "841480252142",
  appId: "1:841480252142:web:5905b833ec1e29e339a1ff"
};

// reCAPTCHA Site Key voor App Check
// Haal deze op uit Firebase Console > App Check > reCAPTCHA providers
// Als je App Check hebt aangezet, staat de site key in de App Check configuratie
const recaptchaSiteKey = "6Ld3yD0sAAAAACLn591gjeA7hnieqL3CWqwqvOUZ"; // Vervang met je reCAPTCHA site key

