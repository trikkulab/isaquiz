// Percorso INTERNO di generazione domande IA (Fase 3) — vedi
// DECISIONI_DESIGN.md, "Generazione domande: interna vs esterna". A differenza
// del percorso esterno (prompt copiato a mano in uno strumento IA personale),
// qui la piattaforma chiama davvero un provider IA per conto del docente:
// riservato all'autore per dogfooding (UTENTE.generazioneIA), verificato
// server-side dalla Cloud Function, non solo lato client.
//
// La chiamata vera (prompt, chiave API, contatore giornaliero) vive in
// functions/aiProvider.js — qui solo l'invocazione della callable.

import { functions } from "./firebaseClient.js";
import { httpsCallable } from "firebase/functions";

const _generaQuesiti = httpsCallable(functions, "generaQuesiti");

// { testo, numero } -> { quesiti: [...] } (stesso schema del percorso
// esterno, vedi validazioneQuesitiCandidati.js). Propaga l'eventuale
// HttpsError (permission-denied, resource-exhausted, invalid-argument,
// internal) a chi chiama, che ne mappa il codice in un messaggio per il docente.
export async function generaQuesitiIA({ testo, numero }) {
  const { data } = await _generaQuesiti({ testo, numero });
  return data.quesiti;
}
