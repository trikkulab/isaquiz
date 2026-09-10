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
import { generaCodiceQuiz } from "./codiciAccessoRepository.js";

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
  // QR e del codice di accesso. Da qui il contenuto è immutabile (vedi
  // DECISIONI_DESIGN.md, "Stati del quiz"). Passaggio a senso unico.
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  const stato = snap.data().stato;
  if (stato !== "bozza" && stato !== "attivo") return stato; // chiuso/archiviato: niente
  if (stato === "bozza") await updateDoc(ref, { stato: "attivo", avviato: serverTimestamp() });
  await generaCodiceQuiz(quizId); // idempotente: crea il codice se manca
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
  // "chiuso" -> "attivo": riapre alle risposte (es. per i ritardatari). Lo
  // stesso codice di accesso torna valido (non se ne genera uno nuovo);
  // generaCodiceQuiz lo crea solo se per qualche motivo mancava.
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  if (snap.data().stato !== "chiuso") return snap.data().stato;
  await updateDoc(ref, { stato: "attivo", riaperto: serverTimestamp() });
  await generaCodiceQuiz(quizId);
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
  // "chiuso" -> "archiviato": il quiz esce dalle liste attive del docente ma
  // resta risolvibile per RISPOSTA/QuizRisultati e per i risultati. Il contenuto
  // è già immutabile da "attivo". `stato` è metadato mutabile: reversibile con
  // ripristinaQuiz (come `attivo` <-> `chiuso`, e come `attivo` sui quesiti).
  // Vedi DECISIONI_DESIGN.md, "Stati del quiz".
  //
  // NON libera il codice di accesso (`codici_accesso/{codice}` resta): la
  // scrittura su quella collezione è solo lato server e non vale una Cloud
  // Function per un codice orfano innocuo (QuizStudente blocca comunque un quiz
  // archiviato). Eventuale pulizia = fetta separata, forse, un giorno.
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  if (snap.data().stato !== "chiuso") {
    throw new Error("Solo un quiz chiuso può essere archiviato.");
  }
  await updateDoc(ref, { stato: "archiviato", archiviato: serverTimestamp() });
  return "archiviato";
}

export async function ripristinaQuiz(quizId) {
  // "archiviato" -> "chiuso": annulla l'archiviazione, il quiz torna nelle liste
  // attive. Nessun effetto collaterale (il contenuto non cambia, il codice non
  // era stato liberato). Da qui il docente può eventualmente riaprire alle
  // risposte con riapriQuiz.
  const ref = doc(db, "quiz", quizId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Quiz non trovato.");
  if (snap.data().stato !== "archiviato") {
    throw new Error("Solo un quiz archiviato può essere ripristinato.");
  }
  await updateDoc(ref, { stato: "chiuso", ripristinato: serverTimestamp() });
  return "chiuso";
}
