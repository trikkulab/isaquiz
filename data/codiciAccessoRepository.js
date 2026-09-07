// Collezione "codici_accesso": corrispondenza codice-breve -> quizId, usata
// dallo studente per entrare in un quiz digitando 6 caratteri invece di
// scansionare il QR o aprire il link lungo.
//
// L'id del documento È il codice, così il lookup codice -> quizId è un getDoc
// diretto (nessuna query, nessun indice). Collezione a parte, non un campo su
// `quiz` (vedi DECISIONI_DESIGN.md, "Codice di accesso ai quiz").
//
// Da non confondere con `CORSO.codiceAccesso`: quello serve a iscriversi a un
// CORSO (per l'anno), questo a partecipare a una singola somministrazione.

import { db } from "./firebaseClient.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// Crockford Base32: niente I, L, O, U (ambigui a occhio).
const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// UNICO punto in cui vive la lunghezza del codice: la usa solo la generazione.
// Il resto del codice (normalizzazione, validazione input, lookup) è
// length-agnostic: un codice è valido se, normalizzato, corrisponde a un
// documento di `codici_accesso`. Cambiare questo numero non richiede altre
// modifiche (i codici già emessi restano validi con la loro lunghezza).
const LUNGHEZZA_GENERAZIONE = 6;

const codiciCol = collection(db, "codici_accesso");

// Normalizza un codice digitato dall'utente:
//  1. maiuscolo;
//  2. "clemenza in lettura" di Crockford — chi ricopia il codice può
//     confondere 1 con I/L e 0 con O;
//  3. ALLOWLIST: si tengono SOLO i caratteri dell'alfabeto Crockford. Tutto
//     il resto (spazi, trattini, punteggiatura, `/`, `..`, `<>`, emoji…)
//     sparisce. Così l'output è sempre un id di documento Firestore valido e
//     innocuo, e un input malformato diventa semplicemente "codice non
//     valido" invece di far lanciare l'SDK.
// Nessun controllo di lunghezza: se non corrisponde a nessun documento è
// semplicemente "non valido".
export function normalizzaCodice(input) {
  const grezzo = String(input ?? "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  let out = "";
  for (const c of grezzo) if (ALFABETO.includes(c)) out += c;
  return out;
}

function generaCodiceCasuale() {
  const bytes = crypto.getRandomValues(new Uint8Array(LUNGHEZZA_GENERAZIONE));
  let out = "";
  for (const b of bytes) out += ALFABETO[b % 32]; // 256 % 32 === 0 -> nessun bias
  return out;
}

export async function getQuizIdDaCodice(codice) {
  const norm = normalizzaCodice(codice);
  if (!norm) return null; // stringa vuota (o solo caratteri non validi)

  let ref;
  try {
    ref = doc(db, "codici_accesso", norm);
  } catch {
    // norm è alfabeto Crockford, ma potrebbe superare il limite di lunghezza
    // di un id documento (paste enorme): non è un codice valido.
    return null;
  }
  const snap = await getDoc(ref); // errori di rete propagano (≠ "codice non valido")
  return snap.exists() ? snap.data().quizId : null;
}

export async function getCodiceQuiz(quizId) {
  const snap = await getDocs(query(codiciCol, where("quizId", "==", quizId)));
  return snap.empty ? null : snap.docs[0].id;
}

export async function generaCodiceQuiz(quizId) {
  // Idempotente: se un codice per questo quiz c'è già, lo riusa (il codice è
  // stabile per tutta la vita del quiz, chiudi/riapri non lo cambiano).
  const esistente = await getCodiceQuiz(quizId);
  if (esistente) return esistente;

  // Check-then-create. Micro-race accettata PER ORA (un docente pubblica un
  // quiz alla volta) — da sostituire con una transazione / Cloud Function
  // quando arrivano auth e functions (Fase 2). Vedi DECISIONI_DESIGN.md.
  for (let tentativo = 0; tentativo < 5; tentativo++) {
    const codice = generaCodiceCasuale();
    const ref = doc(db, "codici_accesso", codice);
    if ((await getDoc(ref)).exists()) continue;
    await setDoc(ref, { quizId, creato: serverTimestamp() });
    return codice;
  }
  throw new Error("Impossibile generare un codice di accesso univoco.");
}
