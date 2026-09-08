// Callable: genera (o restituisce, se già esistente) il codice di accesso breve
// di un quiz, in modo atomico. Sostituisce il loop check-then-create
// client-side di data/codiciAccessoRepository.js, che aveva una micro-race nota
// (due generazioni simultanee). Vedi DECISIONI_DESIGN.md, "Codice di accesso
// ai quiz".
//
// Chiamata da data/quizRepository.js dentro avviaQuiz / riapriQuiz (quiz già
// in stato "attivo"). Idempotente.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";

import { db, REGIONE } from "./_admin.js";

// Sincronizzato a mano con data/codiciAccessoRepository.js: functions/ non può
// importare da data/ (in deploy viene caricato solo functions/). L'alfabeto è
// Crockford Base32; la lunghezza è parametro di sola generazione.
const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LUNGHEZZA_GENERAZIONE = 6;

function generaCodiceCasuale() {
  const bytes = crypto.getRandomValues(new Uint8Array(LUNGHEZZA_GENERAZIONE));
  let out = "";
  for (const b of bytes) out += ALFABETO[b % 32]; // 256 % 32 === 0 -> nessun bias
  return out;
}

export const generaCodiceAccesso = onCall({ region: REGIONE }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");

  const quizId = request.data?.quizId;
  if (!quizId || typeof quizId !== "string") {
    throw new HttpsError("invalid-argument", "quizId mancante o non valido.");
  }

  const quizSnap = await db.doc(`quiz/${quizId}`).get();
  if (!quizSnap.exists) throw new HttpsError("not-found", "Quiz non trovato.");
  const quiz = quizSnap.data();
  if (quiz.autoreId !== uid) {
    throw new HttpsError("permission-denied", "Non sei l'autore di questo quiz.");
  }
  if (quiz.stato !== "attivo") {
    throw new HttpsError("failed-precondition", "Il codice si genera solo per un quiz attivo.");
  }

  const codiciCol = db.collection("codici_accesso");

  const codice = await db.runTransaction(async (tx) => {
    // Tutte le letture prima di ogni scrittura (vincolo delle transazioni).
    const esistenti = await tx.get(codiciCol.where("quizId", "==", quizId).limit(1));
    if (!esistenti.empty) return esistenti.docs[0].id; // idempotente

    for (let tentativo = 0; tentativo < 5; tentativo++) {
      const candidato = generaCodiceCasuale();
      const ref = codiciCol.doc(candidato);
      const s = await tx.get(ref);
      if (!s.exists) {
        tx.set(ref, { quizId, creato: FieldValue.serverTimestamp() });
        return candidato;
      }
    }
    throw new HttpsError("resource-exhausted", "Impossibile generare un codice univoco.");
  });

  logger.info(`Codice di accesso per ${quizId}: ${codice}`);
  return { codice };
});
