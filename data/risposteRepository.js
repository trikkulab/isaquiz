// Unico punto di accesso alla collezione "risposte" — collezione top-level
// (non sotto-collezione di quiz), con quizId/studenteId/domandaId come campi.
// Scelta deliberata: serve interrogare "tutte le risposte di uno studente nel
// tempo" trasversalmente ai quiz, per le statistiche e i progressi — il caso
// d'uso centrale del progetto, non "le risposte di UN quiz" (che sarebbe stato
// più comodo con una sotto-collezione, ma è un caso d'uso secondario qui).
//
// Importante: il client scrive solo la risposta grezza (rispostaData). Il campo
// "corretta" NON viene mai scritto da qui — lo calcola functions/calcolaPunteggio.js
// lato server, per evitare manipolazioni del punteggio.

// import { db } from "./firebaseClient.js";

export async function saveAnswer(quizId, studenteId, domandaId, rispostaData) {
  // TODO Fase 1: scrive solo il dato grezzo, mai "corretta".
}

export async function getRisposteQuiz(quizId, studenteId) {
  // Per la correzione di UN quiz specifico (QuizRisultati).
  // TODO Fase 1.
}

export async function getStatistichePerArgomento(studenteId, materia) {
  // Aggrega le risposte dello studente per argomento della domanda collegata.
  // Percorso: risposte dello studente -> domandaId -> domanda.argomento -> raggruppa.
  // Un quiz "misto" (più argomenti) contribuisce a più gruppi: è corretto, non un bug.
  // TODO Fase 4/5.
}

export async function getQuizPerArgomento(studenteId, argomento) {
  // Per il drill-down nell'accordion/pannello: deduplica i quizId dalle risposte
  // filtrate per argomento, e per ciascuno calcola il punteggio CONTESTUALE
  // ("3/4 su questo argomento"), non il punteggio totale del quiz.
  // TODO Fase 4/5.
}
