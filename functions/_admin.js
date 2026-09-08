// Inizializzazione unica dell'Admin SDK per tutte le Cloud Function.
// Nessun altro file di functions/ deve chiamare initializeApp(): importano
// `db` (e all'occorrenza `auth`) da qui.
//
// In emulatore l'Admin SDK si aggancia da sé a FIRESTORE_EMULATOR_HOST /
// FIREBASE_AUTH_EMULATOR_HOST, impostati dalla Firebase CLI quando gira
// `firebase emulators:start`. In produzione usa le credenziali di default
// dell'ambiente Cloud Functions. In entrambi i casi: nessuna chiave nel repo.

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp();

export const db = getFirestore();

// Regione di deploy delle function — stessa del Firestore reale
// (`europe-west8`, Milano; vedi docs/deploy.md). Passata esplicitamente nelle
// opzioni di ogni function: con gli import ESM hoistati non è affidabile
// affidarsi a setGlobalOptions() nel corpo di index.js.
export const REGIONE = "europe-west8";
