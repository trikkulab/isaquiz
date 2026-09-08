// Unico punto di accesso al documento singleton `config/current` (entità CONFIG:
// anno scolastico corrente, lista docenti autorizzati, dominio istituzionale,
// nome/codice istituto — vedi CLAUDE.md e docs/isaquiz_ERD.md).
//
// `docentiAutorizzati` è la fonte di verità per il ruolo docente: viene
// consultata a OGNI login (data/authProvider.js), non solo al primo.

import { db } from "./firebaseClient.js";
import { doc, getDoc } from "firebase/firestore";

const configRef = doc(db, "config", "current");

export async function getConfig() {
  const snap = await getDoc(configRef);
  return snap.exists() ? snap.data() : null;
}

// Lista email dei docenti autorizzati, normalizzate (minuscolo, senza spazi)
// per un confronto robusto con l'email dell'account Google.
export async function getDocentiAutorizzati() {
  const config = await getConfig();
  const lista = Array.isArray(config?.docentiAutorizzati) ? config.docentiAutorizzati : [];
  return lista.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
}

// Dominio Google Workspace dell'istituto (es. "istituto.example"). Usato per
// l'hint `hd` di Google e per il controllo post-login in authProvider.
// Il controllo "vero" è comunque nelle security rules (una costante nel file).
export async function getDominioIstituzionale() {
  const config = await getConfig();
  const dominio = config?.dominioIstituzionale;
  return dominio ? String(dominio).trim().toLowerCase() : null;
}
