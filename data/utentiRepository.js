// Unico punto di accesso alla collezione "utenti" (tabella UTENTE unica:
// studenti, docenti, admin — vedi CLAUDE.md, "Modello dati: ruoli e corsi").
// Il campo `ruolo` qui è solo cache di comodo; il ruolo in un contesto
// specifico si legge sempre dalla riga di collegamento, mai da qui.

import { db } from "./firebaseClient.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function getUtente(utenteId) {
  if (!utenteId) return null;
  const snap = await getDoc(doc(db, "utenti", utenteId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Crea o aggiorna il documento utente (merge: non azzera campi non passati).
// Usato dal provisioning al login (data/authProvider.js): l'id documento è
// l'uid di Firebase Auth. Ritorna l'utente completo dopo la scrittura.
export async function upsertUtente(uid, dati) {
  if (!uid) throw new Error("upsertUtente: uid mancante.");
  await setDoc(doc(db, "utenti", uid), dati, { merge: true });
  return getUtente(uid);
}

// Nome da mostrare (es. header quiz). Fallback progressivo: nome+cognome ->
// solo uno dei due -> null (chi monta decide se nascondere la riga).
export function nomeVisibile(utente) {
  if (!utente) return null;
  const nome = [utente.nome, utente.cognome].filter(Boolean).join(" ").trim();
  return nome || null;
}
