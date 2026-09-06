// Unico punto di accesso alla collezione "quiz". Nessun componente in /ui deve
// importare Firestore direttamente: passa sempre da qui.
//
// Nota di modellazione: quiz.quesiti è un array di ID (non una sotto-collezione
// né una tabella di giunzione) — evita una lettura extra ad ogni apertura del
// quiz, al costo di dover assemblare il testo dei quesiti con letture separate
// (vedi getQuizConQuesiti).
//
// Un quiz appartiene a un CORSO (corsoId), non a una classe — vedi
// docs/isaquiz_ERD.md e CLAUDE.md ("CORSO, non CLASSE, è il contenitore dei quiz").

import { db } from "./firebaseClient.js";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const quizCol = collection(db, "quiz");

export async function getQuiz(quizId) {
  const snap = await getDoc(doc(db, "quiz", quizId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getQuizConQuesiti(quizId) {
  // TODO Fase 1 (seguito): getQuiz(quizId) + risoluzione degli ID in quesiti.
  // Qui vive esplicitamente il "niente JOIN": due letture assemblate nel codice,
  // non una query sola.
}

export async function creaQuiz({ titolo, corsoId, docenteId, quesiti }) {
  // Salva un quiz in stato "bozza". L'avvio (stato -> "attivo") e il QR sono
  // una fetta successiva: qui ci si ferma alla composizione.
  const ref = await addDoc(quizCol, {
    titolo,
    corsoId,
    autoreId: docenteId,
    quesiti, // array di ID quesito
    stato: "bozza",
    creato: serverTimestamp(),
  });
  return ref.id;
}

export async function avviaQuiz(quizId) {
  // TODO fetta successiva: stato "bozza" -> "attivo", coincide con la
  // pubblicazione (generazione del QR). Da quel momento il quiz è immutabile
  // e permanente. Vedi DECISIONI_DESIGN.md, "Stati del quiz".
}

export async function archiviaQuiz(quizId) {
  // TODO fetta successiva (opzionale, non MVP): stato "attivo" -> "archiviato".
  // Non cancella nulla: toglie solo il quiz dalle liste attive del docente,
  // il riferimento resta intatto per RISPOSTA/QuizRisultati.
}
