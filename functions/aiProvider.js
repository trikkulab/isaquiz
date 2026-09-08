// Unico punto di chiamata al provider IA esterno. La chiave API vive solo qui,
// come variabile d'ambiente della function — mai nel client, mai in /ui, mai
// in un file versionato.
//
// Vincolo GDPR da rispettare nell'interfaccia a monte (CreaQuiz.jsx): il testo
// inviato qui deve essere appunti/argomenti del docente, mai dati di studenti
// specifici (nomi, valutazioni) — vedi analisi GDPR, sezione 5.
//
// TODO Fase 3. Per ora è un wrapper vuoto (callable), serve solo a rendere la
// function deployabile/emulabile.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { REGIONE } from "./_admin.js";

export const generaQuesiti = onCall({ region: REGIONE }, async (request) => {
  // TODO Fase 3: request.data.testo -> chiamata al provider -> quesiti proposti,
  // che il docente dovrà sempre rivedere prima di pubblicarli (human in the loop).
  throw new HttpsError("unimplemented", "Generazione IA non ancora disponibile (Fase 3).");
});
