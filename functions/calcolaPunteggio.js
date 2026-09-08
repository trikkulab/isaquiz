// Si attiva alla scrittura di una risposta grezza in Firestore. Confronta con
// la risposta corretta del quesito (`indiceCorretto`, che il client non deve
// poter usare come fonte di verità) e scrive il campo `corretta` sul documento
// risposta. Il client non calcola né scrive mai questo campo: previene la
// manipolazione del punteggio da parte dello studente (le security rules
// vietano `corretta` nel payload del client — vedi firestore.rules).
//
// TODO Fase 2 (step 4): implementare il confronto. Per ora è un wrapper vuoto,
// serve solo a rendere la function deployabile/emulabile.

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { REGIONE } from "./_admin.js";

export const calcolaPunteggio = onDocumentWritten(
  { document: "risposte/{rispostaId}", region: REGIONE },
  async (event) => {
    // TODO step 4: leggere event.data.after, il quesito corrispondente,
    // confrontare rispostaData.opzioneScelta con quesito.indiceCorretto,
    // scrivere risposta.corretta (con guardia anti-loop).
  },
);
