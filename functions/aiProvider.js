// Unico punto di chiamata al provider IA esterno. La chiave API vive solo qui,
// come variabile d'ambiente della function — mai nel client, mai in /ui, mai
// in un file versionato.
//
// Vincolo GDPR da rispettare nell'interfaccia a monte (CreaQuiz.jsx): il testo
// inviato qui deve essere appunti/argomenti del docente, mai dati di studenti
// specifici (nomi, valutazioni) — vedi analisi GDPR, sezione 5.
//
// TODO Fase 3.

export async function generaQuesiti(request) {
  // TODO: request.data.testo -> chiamata al provider -> risposta con
  // quesiti proposti, che il docente dovrà sempre rivedere prima di pubblicarli
  // (human in the loop).
}
