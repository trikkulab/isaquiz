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
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { getQuesito } from "./quesitiRepository.js";
import { getCorso } from "./corsiRepository.js";
import { getUtente, nomeVisibile } from "./utentiRepository.js";

const quizCol = collection(db, "quiz");

export async function getQuiz(quizId) {
  const snap = await getDoc(doc(db, "quiz", quizId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Quiz pronto da mostrare: gli id in quiz.quesiti risolti nei quesiti veri
// (in ordine), più materia (dal corso) e docente (dall'autore) per l'header.
// "Niente JOIN": letture separate assemblate qui, non una query sola.
// Ogni id in quiz.quesiti è la versione specifica scelta al momento della
// composizione (`baseId-vN`): getQuesito la risolve esatta, così un quiz già
// somministrato mostra per sempre ciò che ha visto lo studente.
export async function getQuizConQuesiti(quizId) {
  const quiz = await getQuiz(quizId);
  if (!quiz) return null;

  const [quesitiRisolti, corso, autore] = await Promise.all([
    Promise.all((quiz.quesiti ?? []).map((id) => getQuesito(id))),
    getCorso(quiz.corsoId),
    getUtente(quiz.autoreId),
  ]);

  return {
    ...quiz,
    quesiti: quesitiRisolti.filter(Boolean), // scarta id non risolvibili
    materia: corso?.materia ?? null,
    docente: nomeVisibile(autore),
  };
}

// Quiz del docente per la sua home: solo i meta (niente risoluzione quesiti),
// arricchiti con la materia del corso. Ordinati dal più recente.
export async function getQuizDocente(docenteId) {
  const snap = await getDocs(query(quizCol, where("autoreId", "==", docenteId)));
  const quizzes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Una lettura per corso distinto, non una per quiz.
  const corsi = new Map();
  await Promise.all(
    [...new Set(quizzes.map((q) => q.corsoId).filter(Boolean))].map(async (cid) => {
      corsi.set(cid, await getCorso(cid));
    }),
  );

  return quizzes
    .map((q) => ({ ...q, materia: corsi.get(q.corsoId)?.materia ?? null }))
    .sort((a, b) => (b.creato?.toMillis?.() ?? 0) - (a.creato?.toMillis?.() ?? 0));
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

export async function aggiornaQuizBozza(quizId, { titolo, corsoId, quesiti }) {
  // Salva le modifiche a una bozza. Consentito SOLO finché stato === "bozza"
  // (un quiz avviato è immutabile — vedi DECISIONI_DESIGN.md, "Stati del quiz").
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  if (snap.data().stato !== "bozza") throw new Error("Il quiz non è più in bozza.");
  await updateDoc(ref, { titolo, corsoId, quesiti, modificato: serverTimestamp() });
}

export async function duplicaQuiz(quizId, docenteId) {
  // Copia indipendente: nuovo documento in "bozza", quesiti copiati come array
  // di riferimenti (gli stessi id, non i quesiti). Nessun legame con
  // l'originale (vedi DECISIONI_DESIGN.md, "Stati del quiz" — duplicazione,
  // non modifica).
  const src = await getQuiz(quizId);
  if (!src) throw new Error("Quiz non trovato.");
  return creaQuiz({
    titolo: `Copia di ${src.titolo}`,
    corsoId: src.corsoId,
    docenteId,
    quesiti: [...(src.quesiti ?? [])],
  });
}

export async function avviaQuiz(quizId) {
  // "bozza" -> "attivo": è la pubblicazione, coincide con la generazione del
  // QR. Da qui il quiz è immutabile e permanente (vedi DECISIONI_DESIGN.md,
  // "Stati del quiz"). Passaggio a senso unico: se il quiz non è più in
  // bozza non si fa nulla.
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  if (snap.data().stato !== "bozza") return snap.data().stato;
  await updateDoc(ref, { stato: "attivo", avviato: serverTimestamp() });
  return "attivo";
}

export async function chiudiQuiz(quizId) {
  // "attivo" -> "chiuso": gli studenti non possono più aprire il quiz (fine
  // della somministrazione in classe). Reversibile con riapriQuiz. Il
  // contenuto resta immutabile. Vedi DECISIONI_DESIGN.md, "Stati del quiz".
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  if (snap.data().stato !== "attivo") return snap.data().stato;
  await updateDoc(ref, { stato: "chiuso", chiuso: serverTimestamp() });
  return "chiuso";
}

export async function riapriQuiz(quizId) {
  // "chiuso" -> "attivo": riapre alle risposte (es. per i ritardatari).
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  if (snap.data().stato !== "chiuso") return snap.data().stato;
  await updateDoc(ref, { stato: "attivo", riaperto: serverTimestamp() });
  return "attivo";
}

export async function eliminaQuiz(quizId) {
  // Delete FISICO — consentito SOLO in bozza: un quiz mai avviato non è
  // esistito per nessuno studente. Un quiz attivo/chiuso/archiviato non si
  // cancella mai (vedi DECISIONI_DESIGN.md, "Stati del quiz").
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().stato !== "bozza") {
    throw new Error("Solo un quiz in bozza può essere eliminato.");
  }
  await deleteDoc(ref);
}

export async function archiviaQuiz(quizId) {
  // TODO fetta successiva (opzionale, non MVP): stato "attivo" -> "archiviato".
  // Non cancella nulla: toglie solo il quiz dalle liste attive del docente,
  // il riferimento resta intatto per RISPOSTA/QuizRisultati.
}
