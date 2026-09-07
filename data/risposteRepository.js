// Unico punto di accesso alla collezione "risposte" — collezione top-level
// (non sotto-collezione di quiz), con quizId/studenteId/quesitoId come campi.
// Scelta deliberata: serve interrogare "tutte le risposte di uno studente nel
// tempo" trasversalmente ai quiz, per le statistiche e i progressi — il caso
// d'uso centrale del progetto, non "le risposte di UN quiz" (che sarebbe stato
// più comodo con una sotto-collezione, ma è un caso d'uso secondario qui).
//
// Importante: il client scrive solo la risposta grezza (rispostaData). Il campo
// "corretta" NON viene mai scritto da qui — spetta a functions/calcolaPunteggio.js
// lato server (stub per ora: il giusto/sbagliato è calcolato lato client
// confrontando rispostaData.opzioneScelta con quesito.indiceCorretto — rischio
// noto e accettato, vedi DECISIONI_DESIGN.md, "Flusso quiz studente").

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

const risposteCol = collection(db, "risposte");

export async function saveAnswer(quizId, studenteId, quesitoId, rispostaData) {
  // Id deterministico: una seconda risposta allo stesso quesito sovrascrive,
  // non duplica (una risposta per tripla quiz+studente+quesito).
  const id = `${quizId}_${studenteId}_${quesitoId}`;
  await setDoc(doc(db, "risposte", id), {
    quizId,
    studenteId,
    quesitoId,
    rispostaData,
    timestamp: serverTimestamp(),
  });
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

export async function getStatistichePerArgomento(studenteId, materia) {
  // Aggrega le risposte dello studente per argomento del quesito collegato.
  // Percorso: risposte dello studente -> quesitoId -> quesito.argomento -> raggruppa.
  // Un quiz "misto" (più argomenti) contribuisce a più gruppi: è corretto, non un bug.
  // TODO Fase 4/5.
}

export async function getQuizPerArgomento(studenteId, argomento) {
  // Per il drill-down nell'accordion/pannello: deduplica i quizId dalle risposte
  // filtrate per argomento, e per ciascuno calcola il punteggio CONTESTUALE
  // ("3/4 su questo argomento"), non il punteggio totale del quiz.
  // TODO Fase 4/5.
}
