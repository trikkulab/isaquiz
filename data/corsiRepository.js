// Unico punto di accesso ai corsi (entità CORSO) e al collegamento
// docente-corso (DOCENTE_CORSO). Nessun componente in /ui tocca Firestore
// direttamente: passa sempre da qui.
//
// Ricorda (CLAUDE.md): il ruolo di una persona in un corso specifico si legge
// SEMPRE dalla riga di collegamento (DOCENTE_CORSO), mai dal campo generico
// UTENTE.ruolo.

import { db } from "./firebaseClient.js";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

export async function getCorso(corsoId) {
  if (!corsoId) return null;
  const snap = await getDoc(doc(db, "corsi", corsoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getCorsiDocente(docenteId) {
  // "Niente JOIN": prima le righe di collegamento, poi i corsi, assemblati qui.
  const legami = await getDocs(
    query(collection(db, "docenti_corso"), where("docenteId", "==", docenteId)),
  );

  const corsi = await Promise.all(
    legami.docs.map(async (legame) => {
      const { corsoId, ruolo } = legame.data();
      const corsoSnap = await getDoc(doc(db, "corsi", corsoId));
      if (!corsoSnap.exists()) return null;
      return { id: corsoSnap.id, ruolo, ...corsoSnap.data() };
    }),
  );

  return corsi.filter(Boolean);
}
