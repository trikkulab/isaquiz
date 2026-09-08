// Si attiva alla scrittura di una risposta in Firestore. Confronta la scelta
// grezza dello studente (`rispostaData.opzioneScelta`) con la risposta corretta
// del quesito (`indiceCorretto`) e scrive il campo `corretta` sul documento
// risposta.
//
// Il client non calcola né scrive mai `corretta` (le security rules lo vietano
// nel payload): così lo studente non può manipolare il punteggio. Il calcolo
// lato client che resta in UI (RisultatiDocente, QuizRisultati) è solo per il
// display immediato e non è la fonte di verità.
//
// Trigger su onDocumentWritten (create + update): copre sia la prima risposta
// sia il cambio di risposta (stesso id, `rispostaData` diverso -> ricalcolo).

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

import { db, REGIONE } from "./_admin.js";

export const calcolaPunteggio = onDocumentWritten(
  { document: "risposte/{rispostaId}", region: REGIONE },
  async (event) => {
    const dopo = event.data?.after;
    if (!dopo?.exists) return; // risposta cancellata: niente da fare

    const risposta = dopo.data();
    const quesitoId = risposta.quesitoId;
    if (!quesitoId) {
      logger.warn(`Risposta ${event.params.rispostaId} senza quesitoId, salto.`);
      return;
    }

    const quesitoSnap = await db.doc(`quesiti/${quesitoId}`).get();
    if (!quesitoSnap.exists) {
      logger.warn(`Quesito ${quesitoId} non trovato per la risposta ${event.params.rispostaId}.`);
      return;
    }

    const corretta = risposta.rispostaData?.opzioneScelta === quesitoSnap.data().indiceCorretto;

    // Guardia anti-loop: l'update qui sotto rientra nel trigger. Si scrive solo
    // se il valore cambia davvero.
    if (risposta.corretta === corretta) return;

    await dopo.ref.update({ corretta });
    logger.info(`Risposta ${event.params.rispostaId}: corretta=${corretta}`);
  },
);
