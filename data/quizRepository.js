// Unico punto di accesso alla collezione "quiz". Nessun componente in /ui deve
// importare Firestore direttamente: passa sempre da qui.
//
// Nota di modellazione: quiz.quesiti è un array di ID (non una sotto-collezione
// né una tabella di giunzione) — evita una lettura extra ad ogni apertura del
// quiz, al costo di dover assemblare il testo dei quesiti con letture separate
// (vedi getQuizConQuesiti).

// import { db } from "./firebaseClient.js";
// import { collection, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";

export async function getQuiz(quizId) {
  // TODO Fase 1: legge quiz/{quizId}
}

export async function getQuizConQuesiti(quizId) {
  // TODO Fase 1: getQuiz(quizId) + risoluzione degli ID in quesiti.
  // Qui vive esplicitamente il "niente JOIN": due letture assemblate nel codice,
  // non una query sola.
}

export async function creaQuiz({ titolo, classeId, docenteId, quesiti }) {
  // TODO Fase 1
}

export async function avviaQuiz(quizId) {
  // TODO Fase 1: stato -> "attivo"
}

export async function chiudiQuiz(quizId) {
  // TODO Fase 1: stato -> "chiuso"
}
