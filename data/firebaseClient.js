// Unico punto di inizializzazione dell'SDK Firebase. Nessun altro file del
// progetto deve chiamare initializeApp() — tutti importano `db` (e in Fase 2
// `auth`) da qui.

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// Sviluppo locale: con VITE_USE_FIRESTORE_EMULATOR="true" tutte le letture/
// scritture vanno all'emulatore Firestore (progetto "demo-isaquiz", nessuna
// chiave reale necessaria). Vedi package.json alla radice ("npm run emu").
if (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === "true") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// TODO Fase 2: export const auth = getAuth(app);
