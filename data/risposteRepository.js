// Unico punto di accesso alla collezione "risposte" — collezione top-level
// (non sotto-collezione di quiz), con quizId/studenteId/quesitoId come campi.
// Scelta deliberata: serve interrogare "tutte le risposte di uno studente nel
// tempo" trasversalmente ai quiz, per le statistiche e i progressi — il caso
// d'uso centrale del progetto, non "le risposte di UN quiz" (che sarebbe stato
// più comodo con una sotto-collezione, ma è un caso d'uso secondario qui).
//
// Importante: il client scrive solo la risposta grezza (rispostaData). Il campo
// "corretta" NON viene mai scritto da qui — lo scrive functions/calcolaPunteggio.js
// lato server (trigger su questa collezione), e le security rules vietano al
// client di toccarlo. Il calcolo lato client che resta in UI serve solo al
// display immediato.

import { db } from "./firebaseClient.js";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { getQuesito } from "./quesitiRepository.js";
import { getQuiz, getQuizCorso } from "./quizRepository.js";
import { getUtente, nomeVisibile } from "./utentiRepository.js";

const risposteCol = collection(db, "risposte");

export async function saveAnswer(quizId, studenteId, quesitoId, rispostaData) {
  // Id deterministico: una seconda risposta allo stesso quesito sovrascrive,
  // non duplica (una risposta per tripla quiz+studente+quesito).
  const id = `${quizId}_${studenteId}_${quesitoId}`;
  // merge: rispondere di nuovo aggiorna rispostaData/timestamp senza rimuovere
  // `corretta` (scritto dal server) — così le rules vedono un update che tocca
  // solo i campi consentiti al client, e calcolaPunteggio ricalcola sull'update.
  await setDoc(
    doc(db, "risposte", id),
    { quizId, studenteId, quesitoId, rispostaData, timestamp: serverTimestamp() },
    { merge: true },
  );
}

export async function getRisposteQuiz(quizId) {
  // Tutte le risposte di un quiz (tutti gli studenti), una tantum.
  const snap = await getDocs(query(risposteCol, where("quizId", "==", quizId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Sottoscrizione LIVE alle risposte di un quiz (vista risultati docente in
// tempo reale). Anche le subscription passano dai repository, non da /ui.
// Ritorna la funzione di annullamento: il chiamante DEVE invocarla allo
// smontaggio. `onDati` riceve [{ id, ... }]; `onErrore` è opzionale.
export function ascoltaRisposteQuiz(quizId, onDati, onErrore) {
  return onSnapshot(
    query(risposteCol, where("quizId", "==", quizId)),
    (snap) => onDati(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onErrore?.(err),
  );
}

export async function getRisposteStudente(quizId, studenteId) {
  // Le risposte di UN studente a UN quiz — per la correzione (QuizRisultati)
  // aperta senza lo state di navigazione (link diretto, refresh).
  const snap = await getDocs(
    query(
      risposteCol,
      where("quizId", "==", quizId),
      where("studenteId", "==", studenteId),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Tutte le risposte di UNO studente, trasversali ai quiz — la lettura di base
// per le statistiche personali ("come sto andando nel tempo, per argomento").
// Le rules consentono la query per solo `studenteId`: ogni documento risultante
// soddisfa `resource.data.studenteId == request.auth.uid`.
export async function getTutteLeRisposteStudente(studenteId) {
  const snap = await getDocs(query(risposteCol, where("studenteId", "==", studenteId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Unisce ogni risposta dello studente ai dati del quesito e del quiz collegati
// ("niente JOIN": letture separate deduplicate, assemblate qui).
//
// Una riga per OGNI domanda dei quiz toccati (almeno una risposta), non solo
// per le domande effettivamente risposte: una domanda saltata (quiz chiuso dal
// docente a metà somministrazione, o una scrittura fallita — `saveAnswer` è
// fire-and-forget) conta come tentata e sbagliata (`esatta: false`), non
// sparisce dall'aggregazione. Decisione e motivazione in
// DECISIONI_DESIGN.md, "Domande non risposte (correzione e aggregazioni)".
async function risposteArricchite(studenteId) {
  const risposte = await getTutteLeRisposteStudente(studenteId);
  if (risposte.length === 0) return [];

  const quizIds = [...new Set(risposte.map((r) => r.quizId).filter(Boolean))];
  const quizzes = await Promise.all(quizIds.map((id) => getQuiz(id)));
  const perQuiz = new Map(quizIds.map((id, i) => [id, quizzes[i]]));

  const quesitiIds = [...new Set(quizzes.flatMap((q) => q?.quesiti ?? []))];
  const quesiti = await Promise.all(quesitiIds.map((id) => getQuesito(id)));
  const perQuesito = new Map(quesitiIds.map((id, i) => [id, quesiti[i]]));

  const rispostaPerCoppia = new Map(risposte.map((r) => [`${r.quizId}::${r.quesitoId}`, r]));

  return quizIds.flatMap((quizId) => {
    const quiz = perQuiz.get(quizId);
    if (!quiz) return [];
    return (quiz.quesiti ?? []).flatMap((quesitoId) => {
      const q = perQuesito.get(quesitoId);
      if (!q) return []; // quesito non più risolvibile (raro, id orfano)
      const r = rispostaPerCoppia.get(`${quizId}::${quesitoId}`);
      return [
        {
          quizId,
          quesitoId,
          argomento: q.argomento ?? "Senza argomento",
          materia: q.materia ?? null,
          esatta: r ? r.rispostaData?.opzioneScelta === q.indiceCorretto : false,
          titoloQuiz: quiz.titolo ?? "Quiz",
          dataQuiz: quiz.avviato ?? quiz.creato ?? null,
        },
      ];
    });
  });
}

// Aggrega le risposte dello studente per ARGOMENTO del quesito (non per quiz —
// vedi DECISIONI_DESIGN.md, "Statistiche studente"). Un quiz "misto" contribuisce
// a più argomenti: è corretto, non un errore di conteggio. Ogni gruppo porta con
// sé il dettaglio dei quiz che vi hanno contribuito (drill-down senza altre
// letture), col punteggio CONTESTUALE ("3/4 su questo argomento"), mai il totale
// del quiz. `materia` (opzionale) filtra al termine; null/undefined = tutte.
// Ritorna: [{ chiave, argomento, materia, corrette, totali,
//             quiz: [{ quizId, titolo, data, corrette, totali }] }]
export async function getStatistichePerArgomento(studenteId, materia = null) {
  const righe = await risposteArricchite(studenteId);

  const gruppi = new Map(); // chiave "materia::argomento" -> gruppo
  for (const r of righe) {
    const chiave = `${r.materia ?? ""}::${r.argomento}`;
    let g = gruppi.get(chiave);
    if (!g) {
      g = { chiave, argomento: r.argomento, materia: r.materia, corrette: 0, totali: 0, _quiz: new Map() };
      gruppi.set(chiave, g);
    }
    g.totali += 1;
    if (r.esatta) g.corrette += 1;

    let q = g._quiz.get(r.quizId);
    if (!q) {
      q = { quizId: r.quizId, titolo: r.titoloQuiz, data: r.dataQuiz, corrette: 0, totali: 0 };
      g._quiz.set(r.quizId, q);
    }
    q.totali += 1;
    if (r.esatta) q.corrette += 1;
  }

  const perDataDesc = (a, b) => (b.data?.toMillis?.() ?? 0) - (a.data?.toMillis?.() ?? 0);

  let out = [...gruppi.values()].map((g) => ({
    chiave: g.chiave,
    argomento: g.argomento,
    materia: g.materia,
    corrette: g.corrette,
    totali: g.totali,
    quiz: [...g._quiz.values()].sort(perDataDesc),
  }));

  if (materia != null) out = out.filter((g) => g.materia === materia);

  return out.sort(
    (a, b) =>
      (a.materia ?? "").localeCompare(b.materia ?? "", "it") ||
      a.argomento.localeCompare(b.argomento, "it"),
  );
}

// I quiz che hanno contribuito a un argomento, col punteggio CONTESTUALE già
// calcolato. Comodità per usi diretti: la pagina statistiche usa la forma
// annidata di getStatistichePerArgomento, così il drill-down non fa altre letture.
export async function getQuizPerArgomento(studenteId, argomento) {
  const argomenti = await getStatistichePerArgomento(studenteId);
  return argomenti.filter((g) => g.argomento === argomento).flatMap((g) => g.quiz);
}

// --- Andamento studente (vista docente) — vedi DECISIONI_DESIGN.md ---------
//
// Soglie del trend a livello MATERIA (= corso): punto di partenza ragionato,
// non derivato da una distribuzione reale (al momento in cui sono state
// scelte, il DB non aveva abbastanza coppie corso-studente con >=4 quiz per
// poterle tarare empiricamente, vedi conversazione di design). Da rivedere
// quando l'uso reale del corso accumula più quiz per studente.
const TREND_MIN_QUIZ = 4;
const TREND_SLOPE_SOGLIA = 5; // punti percentuali di variazione per quiz
const TREND_R_SOGLIA = 0.5; // correlazione minima perché il trend sia "consistente"
const TREND_DEBOLEZZA_SOGLIA = 60; // media sotto cui si parla di debolezza persistente — stesso confine di livelloPadronanza "bassa" (ui/src/utils/colori.js), riuso del numero non del token

// Regressione lineare ai minimi quadrati di `percentuali` (0..100)
// sull'INDICE del quiz (0,1,2,...), non sulla data: conta quanti tentativi
// ha fatto lo studente, non quanti giorni sono passati fra un quiz e
// l'altro (gli intervalli non sono uniformi e non sono il segnale).
function regressioneLineare(percentuali) {
  const n = percentuali.length;
  const mediaX = (n - 1) / 2;
  const mediaY = percentuali.reduce((s, y) => s + y, 0) / n;

  let covXY = 0;
  let varX = 0;
  let varY = 0;

  percentuali.forEach((y, x) => {
    const dx = x - mediaX;
    const dy = y - mediaY;
    covXY += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  });

  const slope = varX === 0 ? 0 : covXY / varX;
  const r = varX === 0 || varY === 0 ? 0 : covXY / Math.sqrt(varX * varY);
  return { slope, r };
}

// Segnale di trend per UN corso (mai per materia in astratto — un corso è
// materia+classe+anno, vedi CLAUDE.md): null (silenzio, il default) | "calo"
// | "debolezza" | "miglioramento". Pura, nessuna dipendenza da Firestore.
// `percentuali`: punteggi % dei quiz in ordine cronologico.
export function calcolaTrendMateria(percentuali) {
  if (percentuali.length < TREND_MIN_QUIZ) return null;

  const { slope, r } = regressioneLineare(percentuali);
  if (slope <= -TREND_SLOPE_SOGLIA && r <= -TREND_R_SOGLIA) return "calo";
  if (slope >= TREND_SLOPE_SOGLIA && r >= TREND_R_SOGLIA) return "miglioramento";

  const media = percentuali.reduce((s, y) => s + y, 0) / percentuali.length;
  if (media < TREND_DEBOLEZZA_SOGLIA) return "debolezza";

  return null;
}

// Vista docente: andamento di tutti gli studenti di UN corso — mai
// cross-corso (vedi CLAUDE.md, "CORSO, non CLASSE, è il contenitore dei
// quiz"). Una lettura aggregata, poi tutto in memoria: il drill-down per
// studente non fa altre letture (stesso principio di getStatistichePerArgomento).
// Per ogni studente: la serie cronologica dei punteggi quiz (usata per il
// trend) e la rottura per argomento (frazione grezza, NIENTE trend qui —
// vedi DECISIONI_DESIGN.md, "Andamento studente").
// Ritorna: [{ studenteId, nome, nQuiz, media, segnale,
//             serieQuiz: [{ quizId, titolo, data, corrette, totali }],
//             argomenti: [{ argomento, corrette, totali }] }]
// Ordinati con priorità: calo, debolezza, nessun segnale, miglioramento —
// dove serve più attenzione, prima. `docenteId` è chi chiede (il docente
// loggato): getQuizCorso lo usa per restare dentro ciò che le rules
// consentono di elencare — vedi la nota lì.
//
// Uno studente compare per un quiz solo se ha risposto ad ALMENO una
// domanda (altrimenti "non ha mai aperto il quiz" sarebbe indistinguibile da
// "0/N"); da lì, però, si contano TUTTE le domande del quiz — una saltata
// (chiusura anticipata, scrittura fallita) conta come tentata e sbagliata,
// non sparisce. Vedi DECISIONI_DESIGN.md, "Domande non risposte (correzione
// e aggregazioni)".
export async function getAndamentoCorso(corsoId, docenteId) {
  const quizzes = await getQuizCorso(corsoId, docenteId);
  if (quizzes.length === 0) return [];

  const risposte = (await Promise.all(quizzes.map((q) => getRisposteQuiz(q.id)))).flat();
  if (risposte.length === 0) return [];

  const quesitiIds = [...new Set(quizzes.flatMap((q) => q.quesiti ?? []))];
  const quesiti = await Promise.all(quesitiIds.map((id) => getQuesito(id)));
  const perQuesito = new Map(quesitiIds.map((id, i) => [id, quesiti[i]]));

  const rispostaPerCoppia = new Map(
    risposte.map((r) => [`${r.quizId}::${r.studenteId}::${r.quesitoId}`, r]),
  );
  const studentiPerQuiz = new Map(); // quizId -> Set(studenteId)
  for (const r of risposte) {
    if (!studentiPerQuiz.has(r.quizId)) studentiPerQuiz.set(r.quizId, new Set());
    studentiPerQuiz.get(r.quizId).add(r.studenteId);
  }

  const perStudente = new Map(); // studenteId -> { perQuiz: Map, argomenti: Map }
  for (const quiz of quizzes) {
    const studentiQuiz = studentiPerQuiz.get(quiz.id);
    if (!studentiQuiz) continue; // nessuno ha risposto a questo quiz

    for (const studenteId of studentiQuiz) {
      let s = perStudente.get(studenteId);
      if (!s) {
        s = { studenteId, perQuiz: new Map(), argomenti: new Map() };
        perStudente.set(studenteId, s);
      }

      let pq = s.perQuiz.get(quiz.id);
      if (!pq) {
        pq = {
          quizId: quiz.id,
          titolo: quiz.titolo,
          data: quiz.avviato ?? quiz.creato ?? null,
          corrette: 0,
          totali: 0,
        };
        s.perQuiz.set(quiz.id, pq);
      }

      for (const quesitoId of quiz.quesiti ?? []) {
        const q = perQuesito.get(quesitoId);
        if (!q) continue; // quesito non più risolvibile (raro, id orfano)
        const r = rispostaPerCoppia.get(`${quiz.id}::${studenteId}::${quesitoId}`);
        const esatta = r ? r.rispostaData?.opzioneScelta === q.indiceCorretto : false;

        pq.totali += 1;
        if (esatta) pq.corrette += 1;

        const argomento = q.argomento ?? "Senza argomento";
        let ag = s.argomenti.get(argomento);
        if (!ag) {
          ag = { argomento, corrette: 0, totali: 0 };
          s.argomenti.set(argomento, ag);
        }
        ag.totali += 1;
        if (esatta) ag.corrette += 1;
      }
    }
  }

  const perDataAsc = (a, b) => (a.data?.toMillis?.() ?? 0) - (b.data?.toMillis?.() ?? 0);

  const idsStudenti = [...perStudente.keys()];
  const utenti = await Promise.all(idsStudenti.map((id) => getUtente(id)));
  const nomePerStudente = new Map(idsStudenti.map((id, i) => [id, nomeVisibile(utenti[i])]));

  const PESO_SEGNALE = { calo: 0, debolezza: 1, miglioramento: 3 };

  return [...perStudente.values()]
    .map((s) => {
      const serieQuiz = [...s.perQuiz.values()].sort(perDataAsc);
      const percentuali = serieQuiz.map((q) => (q.totali ? (100 * q.corrette) / q.totali : 0));
      const totCorrette = serieQuiz.reduce((sum, q) => sum + q.corrette, 0);
      const totTotali = serieQuiz.reduce((sum, q) => sum + q.totali, 0);
      return {
        studenteId: s.studenteId,
        nome: nomePerStudente.get(s.studenteId),
        nQuiz: serieQuiz.length,
        media: totTotali ? Math.round((100 * totCorrette) / totTotali) : 0,
        segnale: calcolaTrendMateria(percentuali),
        serieQuiz,
        argomenti: [...s.argomenti.values()].sort((a, b) =>
          a.argomento.localeCompare(b.argomento, "it"),
        ),
      };
    })
    .sort(
      (a, b) =>
        (PESO_SEGNALE[a.segnale] ?? 2) - (PESO_SEGNALE[b.segnale] ?? 2) ||
        a.nome.localeCompare(b.nome, "it"),
    );
}
