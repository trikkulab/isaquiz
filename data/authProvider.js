// Autenticazione reale (Firebase Auth + Google), dominio istituzionale.
// Sostituisce data/mockAuth.js: tutto il resto del codice non parla mai con
// Firebase Auth direttamente, passa da qui (come per Firestore e i repository).
//
// Flusso:
//  - accediConGoogle(): popup Google, con hint `hd` sul dominio; se l'email
//    non è del dominio istituzionale -> signOut + ErroreDominio.
//  - ascoltaUtenteCorrente(cb): wrapper su onAuthStateChanged. A ogni login
//    (anche al refresh, sessione persistita) RICONTROLLA il ruolo contro
//    CONFIG.docentiAutorizzati e fa l'upsert di `utenti/{uid}`, poi emette
//    l'utente completo (o null allo sign-out).
//  - esci(): signOut.
//
// Il ruolo docente NON è mai autoregistrazione: dipende solo dalla lista in
// CONFIG, riletta a ogni login (togliere un'email -> al login successivo la
// persona torna studente). Vedi CLAUDE.md, "Modello dati: ruoli e corsi".

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebaseClient.js";
import { getDocentiAutorizzati, getDominioIstituzionale } from "./configRepository.js";
import { getUtente, upsertUtente } from "./utentiRepository.js";

export class ErroreDominio extends Error {
  constructor(dominio) {
    super(
      dominio
        ? `Usa l'account della scuola (@${dominio}) per accedere.`
        : "Usa l'account della scuola per accedere.",
    );
    this.name = "ErroreDominio";
    this.dominio = dominio;
  }
}

const LIVELLO_DEFAULT = 1;

// Set chiuso di avatar: la scelta è deterministica sull'uid, così l'avatar di
// default di una persona non cambia tra un login e l'altro e la UI studente
// (BarraQuiz) resta identica a quella dei dati mock.
const AVATAR = ["🦊", "🐼", "🦉", "🐢", "🦁", "🐙", "🦕", "🐝", "🦈", "🐺", "🦥", "🐨"];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarDefault(uid) {
  return AVATAR[hash(String(uid || "")) % AVATAR.length];
}

// Nickname di default: il nome proprio (prima parola del displayName Google),
// altrimenti la parte locale dell'email. Minuscolo, senza spazi.
export function nicknameDefault(displayName, email) {
  const daNome = String(displayName || "").trim().split(/\s+/)[0];
  const base = daNome || String(email || "").split("@")[0] || "studente";
  return base.toLowerCase();
}

// "Mario Rossi" -> { nome: "Mario", cognome: "Rossi" }
// "Anna De Santis" -> { nome: "Anna", cognome: "De Santis" }
function separaNome(displayName, email) {
  const parti = String(displayName || "").trim().split(/\s+/).filter(Boolean);
  if (parti.length === 0) {
    return { nome: String(email || "").split("@")[0] || "", cognome: "" };
  }
  return { nome: parti[0], cognome: parti.slice(1).join(" ") };
}

function dominioDi(email) {
  return String(email || "").split("@")[1]?.toLowerCase() || null;
}

export async function accediConGoogle() {
  const dominio = await getDominioIstituzionale();

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
    ...(dominio ? { hd: dominio } : {}),
  });

  const cred = await signInWithPopup(auth, provider);
  const email = cred.user.email;

  // L'hint `hd` è solo suggerimento lato Google: il controllo vero è qui
  // (e nelle security rules). Un account fuori dominio va disconnesso subito.
  if (dominio && dominioDi(email) !== dominio) {
    await signOut(auth);
    throw new ErroreDominio(dominio);
  }
  return cred.user;
}

export function esci() {
  return signOut(auth);
}

// Provisioning: ricontrolla il ruolo e allinea utenti/{uid}. Ritorna l'utente
// completo ({ id, ...campi }).
async function provisionUtente(user) {
  const email = (user.email || "").toLowerCase();
  const [autorizzati, esistente] = await Promise.all([
    getDocentiAutorizzati(),
    getUtente(user.uid),
  ]);

  const ruolo = autorizzati.includes(email) ? "docente" : "studente";
  const { nome, cognome } = separaNome(user.displayName, email);

  const dati = {
    email,
    nome,
    cognome,
    photoURL: user.photoURL || null,
    ruolo, // ricontrollato a ogni login
  };
  // Campi "di comodo" per la UI studente: solo se non già impostati, così un
  // eventuale nickname/avatar scelto in futuro non viene sovrascritto.
  if (!esistente?.nickname) dati.nickname = nicknameDefault(user.displayName, email);
  if (!esistente?.avatarEmoji) dati.avatarEmoji = avatarDefault(user.uid);
  if (esistente?.livello == null) dati.livello = LIVELLO_DEFAULT;

  return upsertUtente(user.uid, dati);
}

// Sottoscrizione all'utente corrente. `cb` riceve l'oggetto utente completo
// (o null). Ritorna la funzione di annullamento (da chiamare nel cleanup di
// useEffect). Errori di provisioning: `cb(null)` + log, l'app tratta la
// persona come non autenticata.
export function ascoltaUtenteCorrente(cb) {
  let generazione = 0;

  return onAuthStateChanged(auth, async (user) => {
    const mia = ++generazione;

    if (!user) {
      cb(null);
      return;
    }

    // Guardia di dominio anche qui (sessione ripristinata al refresh, non solo
    // subito dopo il popup).
    const dominio = await getDominioIstituzionale();
    if (mia !== generazione) return;
    if (dominio && dominioDi(user.email) !== dominio) {
      await signOut(auth);
      cb(null);
      return;
    }

    try {
      const utente = await provisionUtente(user);
      if (mia !== generazione) return;
      cb(utente);
    } catch (err) {
      console.error("Provisioning utente fallito:", err);
      if (mia === generazione) cb(null);
    }
  });
}
