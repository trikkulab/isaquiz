// Unico punto di accesso alla collezione "quesiti" (banca dati del docente
// e, se quesito.condivisa == true, dell'istituto).
//
// Versionamento (vedi DECISIONI_DESIGN.md, "Versionamento dei quesiti" e
// isaquiz_ERD.md): un quesito NON si modifica mai in place. L'id del documento
// è `${baseId}-v${versione}` (senza padding: -v0, -v1, ... -v10). Il campo
// numerico `versione` è la fonte di verità per ordinare/confrontare; il
// suffisso nell'id serve solo a leggibilità e a costruire l'id per
// concatenazione. Modificare un quesito = creare la versione successiva:
//   - autore originale  -> stesso baseId, versione+1  (salvaNuovaVersione)
//   - chiunque (fork)    -> nuovo baseId, versione 0   (forkQuesito)
// La banca (getBancaDocente) mostra solo l'ultima versione per baseId; le
// versioni precedenti restano su Firestore e sono raggiungibili solo per id
// esatto (getQuesito), perché un quiz già somministrato le referenzia.

import { db } from "./firebaseClient.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const quesitiCol = collection(db, "quesiti");

// Campi "di contenuto" di un quesito — quelli che il form di CreaQuiz può
// modificare quando si crea una nuova versione o un fork. Esclude
// baseId/versione/autoreId/condivisa/fonte, che li decide il repository.
function campiContenuto(q) {
  return {
    testo: q.testo,
    opzioni: q.opzioni,
    indiceCorretto: q.indiceCorretto,
    materia: q.materia ?? null,
    argomento: q.argomento ?? null,
    difficolta: q.difficolta ?? null,
    spiegazione: q.spiegazione ?? null,
  };
}

async function scriviQuesito(id, dati) {
  await setDoc(doc(db, "quesiti", id), { ...dati, creato: serverTimestamp() });
  return id;
}

// Id della versione successiva di un quesito esistente. Puro: assume che
// `quesito` sia già l'ultima versione (è ciò che la banca restituisce).
export function idProssimaVersione(quesito) {
  return `${quesito.baseId}-v${(quesito.versione ?? 0) + 1}`;
}

export async function getBancaDocente(docenteId) {
  // Tutte le righe del docente, poi si tiene solo la versione più alta per
  // baseId (raggruppamento lato client — alla scala attuale niente indice
  // composto Firestore). Fallback difensivo per dati senza baseId/versione.
  const snap = await getDocs(query(quesitiCol, where("autoreId", "==", docenteId)));

  const perBaseId = new Map();
  for (const d of snap.docs) {
    const q = { id: d.id, ...d.data() };
    const baseId = q.baseId ?? q.id;
    const versione = q.versione ?? 0;
    const attuale = perBaseId.get(baseId);
    if (!attuale || versione > (attuale.versione ?? 0)) perBaseId.set(baseId, q);
  }
  return [...perBaseId.values()];
}

export async function getQuesito(quesitoId) {
  // Risoluzione per id esatto — deve funzionare per QUALSIASI versione, non
  // solo l'ultima (serve a QuizRisultati/QuesitoCard sui quiz già svolti).
  const snap = await getDoc(doc(db, "quesiti", quesitoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getQuesitiCondivisi({ materia, argomento, difficolta } = {}) {
  // TODO Fase 4: quesiti con condivisa == true, filtrabili. Anche qui andrà
  // applicato il raggruppamento per baseId (ultima versione).
}

export async function creaQuesito(quesito) {
  // Quesito nuovo, da zero: baseId fresco, versione 0. Creazione manuale
  // (Fase 1); in Fase 3 la stessa funzione salverà i quesiti generati dall'IA
  // dopo la revisione del docente.
  const baseId = doc(quesitiCol).id; // id casuale stile Firestore, senza scrivere
  const versione = 0;
  return scriviQuesito(`${baseId}-v${versione}`, {
    ...campiContenuto(quesito),
    autoreId: quesito.autoreId,
    baseId,
    versione,
    condivisa: false,
    fonte: quesito.fonte ?? "manuale",
  });
}

export async function salvaNuovaVersione(quesitoBase, modifiche) {
  // Versione successiva sotto lo STESSO baseId, stesso autore: la lineage di
  // un quesito proprio prosegue. Non tocca il documento della versione
  // precedente.
  const versione = (quesitoBase.versione ?? 0) + 1;
  return scriviQuesito(`${quesitoBase.baseId}-v${versione}`, {
    ...campiContenuto({ ...quesitoBase, ...modifiche }),
    autoreId: quesitoBase.autoreId,
    baseId: quesitoBase.baseId,
    versione,
    condivisa: quesitoBase.condivisa ?? false,
    fonte: "manuale",
  });
}

export async function forkQuesito(quesitoBase, modifiche, nuovoAutoreId) {
  // Copia propria: NUOVO baseId, versione 0, autore = utente corrente. Usato
  // sia quando si duplica un quesito altrui (banca condivisa, Fase 4) sia
  // quando si duplica un proprio quesito per farne una base diversa. Nessun
  // legame dati con l'originale (fonte resta "manuale", vedi DECISIONI_DESIGN
  // — significato di `fonte` non ancora fissato).
  const baseId = doc(quesitiCol).id;
  const versione = 0;
  return scriviQuesito(`${baseId}-v${versione}`, {
    ...campiContenuto({ ...quesitoBase, ...modifiche }),
    autoreId: nuovoAutoreId,
    baseId,
    versione,
    condivisa: false,
    fonte: "manuale",
  });
}

export async function condividiQuesito(quesitoId, condivisa) {
  // TODO Fase 4
}
