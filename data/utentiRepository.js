// Unico punto di accesso alla collezione "utenti" (tabella UTENTE unica:
// studenti, docenti, admin — vedi CLAUDE.md, "Modello dati: ruoli e corsi").
// Il campo `ruolo` qui è solo cache di comodo; il ruolo in un contesto
// specifico si legge sempre dalla riga di collegamento, mai da qui.

import { db } from "./firebaseClient.js";
import { doc, getDoc } from "firebase/firestore";

export async function getUtente(utenteId) {
  if (!utenteId) return null;
  const snap = await getDoc(doc(db, "utenti", utenteId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Nome da mostrare (es. header quiz). Fallback progressivo: nome+cognome ->
// solo uno dei due -> null (chi monta decide se nascondere la riga).
export function nomeVisibile(utente) {
  if (!utente) return null;
  const nome = [utente.nome, utente.cognome].filter(Boolean).join(" ").trim();
  return nome || null;
}
