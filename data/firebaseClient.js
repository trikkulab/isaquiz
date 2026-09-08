// Unico punto di inizializzazione dell'SDK Firebase. Nessun altro file del
// progetto deve chiamare initializeApp() — tutti importano `db`, `auth`,
// `functions` da qui.

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const USA_EMULATORE = import.meta.env.VITE_USE_FIRESTORE_EMULATOR === "true";

const firebaseConfig = {
  // In emulatore l'apiKey può essere qualsiasi stringa non vuota (nessuna
  // chiave reale necessaria, progetto "demo-isaquiz"). In produzione arriva
  // dai secret VITE_FIREBASE_* (vedi docs/deploy.md).
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (USA_EMULATORE ? "demo-emulator" : undefined),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Cloud Functions callable — stessa regione del deploy (vedi functions/_admin.js
// e docs/deploy.md).
export const functions = getFunctions(app, "europe-west8");

// Sviluppo locale: con VITE_USE_FIRESTORE_EMULATOR="true" tutte le letture/
// scritture, l'autenticazione e le callable vanno agli emulatori locali
// (progetto "demo-isaquiz", nessuna chiave reale necessaria). Vedi package.json
// alla radice ("npm run emu").
if (USA_EMULATORE) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
