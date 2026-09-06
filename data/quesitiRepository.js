// Unico punto di accesso alla collezione "quesiti" (banca dati del docente
// e, se quesito.condivisa == true, dell'istituto).

import { db } from "./firebaseClient.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const quesitiCol = collection(db, "quesiti");

export async function getQuesitiDocente(docenteId) {
  // Quesiti creati/posseduti dal docente (autoreId).
  const snap = await getDocs(query(quesitiCol, where("autoreId", "==", docenteId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getQuesito(quesitoId) {
  const snap = await getDoc(doc(db, "quesiti", quesitoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getQuesitiCondivisi({ materia, argomento, difficolta } = {}) {
  // TODO Fase 4: quesiti con condivisa == true, filtrabili.
}

export async function creaQuesito(quesito) {
  // Creazione manuale (Fase 1). In Fase 3 la stessa funzione salverà i quesiti
  // generati dall'IA dopo la revisione del docente (fonte: "ia").
  // Il client NON scrive niente di "calcolato": indiceCorretto è parte del
  // contenuto del quesito, non un esito (vedi risposteRepository per "corretta").
  const ref = await addDoc(quesitiCol, {
    testo: quesito.testo,
    opzioni: quesito.opzioni,
    indiceCorretto: quesito.indiceCorretto,
    materia: quesito.materia ?? null,
    argomento: quesito.argomento ?? null,
    difficolta: quesito.difficolta ?? null,
    spiegazione: quesito.spiegazione ?? null,
    autoreId: quesito.autoreId,
    condivisa: false,
    fonte: quesito.fonte ?? "manuale",
    creato: serverTimestamp(),
  });
  return ref.id;
}

export async function condividiQuesito(quesitoId, condivisa) {
  // TODO Fase 4
}
