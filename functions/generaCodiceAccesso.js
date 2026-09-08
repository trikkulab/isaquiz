// Callable: genera (o restituisce, se già esistente) il codice di accesso breve
// di un quiz, in modo atomico. Sostituisce il loop check-then-create
// client-side di data/codiciAccessoRepository.js, che aveva una micro-race nota
// (due generazioni simultanee dello stesso codice). Vedi DECISIONI_DESIGN.md,
// "Codice di accesso ai quiz".
//
// TODO Fase 2 (step 5): implementare verifica autore + transazione. Per ora è
// un wrapper vuoto, serve solo a rendere la function deployabile/emulabile.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { REGIONE } from "./_admin.js";

export const generaCodiceAccesso = onCall({ region: REGIONE }, async (request) => {
  // TODO step 5: verificare request.auth, che sia l'autore del quiz, e generare
  // il codice in una runTransaction (idempotente + retry su collisione).
  throw new HttpsError("unimplemented", "generaCodiceAccesso non ancora implementata.");
});
