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

import { db, functions } from "./firebaseClient.js";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Crockford Base32: niente I, L, O, U (ambigui a occhio). Usato solo dalla
// normalizzazione dell'input; la GENERAZIONE del codice (con la sua lunghezza)
// vive lato server in functions/generaCodiceAccesso.js — sincronizzato a mano.
const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

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

// Genera (o riusa, se già presente) il codice di accesso di un quiz. La
// generazione vera è lato server (Cloud Function callable `generaCodiceAccesso`,
// transazione + retry): chiude la micro-race del vecchio check-then-create
// client-side e verifica che il chiamante sia l'autore del quiz. Idempotente.
// Il client non scrive più direttamente su `codici_accesso` (vietato dalle
// security rules). Vedi DECISIONI_DESIGN.md, "Codice di accesso ai quiz".
const _generaCodiceAccesso = httpsCallable(functions, "generaCodiceAccesso");

export async function generaCodiceQuiz(quizId) {
  const { data } = await _generaCodiceAccesso({ quizId });
  return data.codice;
}
