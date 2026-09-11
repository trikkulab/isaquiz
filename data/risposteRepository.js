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
import { getQuiz } from "./quizRepository.js";

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
// ("niente JOIN": letture separate deduplicate, assemblate qui). Una riga per
// risposta; le risposte il cui quesito non è più risolvibile vengono scartate.
async function risposteArricchite(studenteId) {
  const risposte = await getTutteLeRisposteStudente(studenteId);
  if (risposte.length === 0) return [];

  const quesitiIds = [...new Set(risposte.map((r) => r.quesitoId).filter(Boolean))];
  const quizIds = [...new Set(risposte.map((r) => r.quizId).filter(Boolean))];

  const [quesiti, quizzes] = await Promise.all([
    Promise.all(quesitiIds.map((id) => getQuesito(id))),
    Promise.all(quizIds.map((id) => getQuiz(id))),
  ]);
  const perQuesito = new Map(quesitiIds.map((id, i) => [id, quesiti[i]]));
  const perQuiz = new Map(quizIds.map((id, i) => [id, quizzes[i]]));

  return risposte.flatMap((r) => {
    const q = perQuesito.get(r.quesitoId);
    if (!q) return [];
    const quiz = perQuiz.get(r.quizId);
    return [
      {
        quizId: r.quizId,
        quesitoId: r.quesitoId,
        argomento: q.argomento ?? "Senza argomento",
        materia: q.materia ?? null,
        esatta: r.rispostaData?.opzioneScelta === q.indiceCorretto,
        titoloQuiz: quiz?.titolo ?? "Quiz",
        dataQuiz: quiz?.avviato ?? quiz?.creato ?? null,
      },
    ];
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
