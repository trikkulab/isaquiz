// Validazione dell'array intermedio "quesiti-candidati", il contratto
// condiviso dai due percorsi di generazione IA (interna ed esterna) — vedi
// DECISIONI_DESIGN.md, "Generazione domande: interna vs esterna", per lo
// schema completo. Pura: nessun accesso a Firestore, nessuno stato — solo
// controllo di forma, riusata sia per validare il paste iniziale sia riga per
// riga nella pagina di revisione mentre il docente edita.

const OPZIONI_MIN = 2;

// Un singolo quesito candidato: { testo, opzioni, indiceCorretto, spiegazione,
// argomento? }. `spiegazione` è obbligatoria (coerente con QuizRisultati, che
// la mostra sempre in correzione); `argomento` è l'unico campo opzionale.
// `materia` non fa parte di questo schema: la assegna la pagina di revisione
// dal corso selezionato, mai il modello IA.
export function validaQuesitoCandidato(q) {
  const errori = [];
  if (!q || typeof q !== "object") return { valido: false, errori: ["Elemento non è un oggetto."] };

  const testo = typeof q.testo === "string" ? q.testo.trim() : "";
  if (!testo) errori.push("Testo mancante.");

  const opzioni = Array.isArray(q.opzioni)
    ? q.opzioni.map((o) => (typeof o === "string" ? o.trim() : ""))
    : [];
  if (opzioni.length < OPZIONI_MIN || opzioni.some((o) => !o)) {
    errori.push(`Servono almeno ${OPZIONI_MIN} opzioni, tutte non vuote.`);
  }

  const indiceCorretto = Number.isInteger(q.indiceCorretto) ? q.indiceCorretto : null;
  if (indiceCorretto === null || indiceCorretto < 0 || indiceCorretto >= opzioni.length) {
    errori.push("«indiceCorretto» non valido.");
  }

  const spiegazione = typeof q.spiegazione === "string" ? q.spiegazione.trim() : "";
  if (!spiegazione) errori.push("Spiegazione mancante (obbligatoria).");

  return { valido: errori.length === 0, errori };
}

// Forma del payload incollato dal docente: un oggetto con una chiave
// "quesiti" contenente un array non vuoto (vuoto = niente da revisionare).
export function validaPayloadCandidati(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.quesiti)) {
    return { valido: false, errore: 'Il JSON deve avere la forma { "quesiti": [ ... ] }.' };
  }
  if (payload.quesiti.length === 0) {
    return { valido: false, errore: 'L\'elenco "quesiti" è vuoto.' };
  }
  return { valido: true, errore: null };
}
