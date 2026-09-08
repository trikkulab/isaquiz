// Unico punto di accesso al documento singleton `config/current` (entità CONFIG:
// anno scolastico corrente, lista docenti autorizzati, dominio istituzionale,
// nome/codice istituto — vedi CLAUDE.md e docs/isaquiz_ERD.md).
//
// `docentiAutorizzati` è la fonte di verità per il ruolo docente: viene
// consultata a OGNI login (data/authProvider.js), non solo al primo.

import { db } from "./firebaseClient.js";
import { doc, getDoc } from "firebase/firestore";

const configRef = doc(db, "config", "current");
// Sotto-documento pubblico (leggibile senza login): dominio + nome istituto.
// Serve alla pagina di accesso prima che ci sia una sessione. Il resto di
// CONFIG (inclusa la lista docentiAutorizzati) resta dietro autenticazione.
const istitutoRef = doc(db, "config", "istituto");

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

// Dominio Google Workspace dell'istituto (es. "istituto.example"). Da
// config/istituto (pubblico): serve prima del login per l'hint `hd` di Google e
// per il messaggio d'errore. Il controllo "vero" del dominio è comunque nel
// provisioning post-login e nelle security rules (costante nel file rules).
export async function getDominioIstituzionale() {
  const snap = await getDoc(istitutoRef);
  const dominio = snap.exists() ? snap.data().dominioIstituzionale : null;
  return dominio ? String(dominio).trim().toLowerCase() : null;
}

// Nome dell'istituto (per footer/informative). Anche questo da config/istituto.
export async function getNomeIstituto() {
  const snap = await getDoc(istitutoRef);
  return snap.exists() ? (snap.data().nomeIstituto ?? null) : null;
}
