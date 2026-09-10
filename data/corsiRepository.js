// Unico punto di accesso ai corsi (entità CORSO) e al collegamento
// docente-corso (DOCENTE_CORSO). Nessun componente in /ui tocca Firestore
// direttamente: passa sempre da qui.
//
// Ricorda (CLAUDE.md): il ruolo di una persona in un corso specifico si legge
// SEMPRE dalla riga di collegamento (DOCENTE_CORSO), mai dal campo generico
// UTENTE.ruolo.

import { db } from "./firebaseClient.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { getConfig } from "./configRepository.js";
import { getUtente, nomeVisibile } from "./utentiRepository.js";

// Crockford Base32 (niente I L O U, ambigui a occhio). Duplicato — a mano — con
// data/codiciAccessoRepository.js e functions/generaCodiceAccesso.js: è un
// alfabeto stabile, non vale un modulo condiviso (functions/ non importa da
// data/). Qui serve solo a dare un `codiceAccesso` iniziale al corso; l'unicità
// non è critica (non è un id documento) e l'iscrizione degli studenti al corso
// non è ancora implementata.
const ALFABETO_CODICE = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LUNGHEZZA_CODICE_CORSO = 6;

function generaCodiceCorso() {
  const bytes = crypto.getRandomValues(new Uint8Array(LUNGHEZZA_CODICE_CORSO));
  let out = "";
  for (const b of bytes) out += ALFABETO_CODICE[b % 32]; // 256 % 32 === 0 -> nessun bias
  return out;
}

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

// Materie già in uso in TUTTI i corsi dell'istituto (non solo i propri): sono i
// suggerimenti della combobox nel form di creazione corso — così denominazioni
// leggermente diverse ("Informatica" vs "Lab. Informatica") restano visibili a
// tutti. Lettura dell'intera collezione: a scala pilota è trascurabile e non
// richiede indici. Vedi DECISIONI_DESIGN.md, "Combobox materia (form corso)".
export async function getMaterieEsistenti() {
  const snap = await getDocs(collection(db, "corsi"));
  const materie = new Set();
  for (const d of snap.docs) {
    const m = d.data().materia;
    if (m) materie.add(m);
  }
  return [...materie].sort((a, b) => a.localeCompare(b, "it"));
}

// Come sopra, per il campo "classe" del form (es. "3AINF"). CLASSE resta
// un'unità amministrativa a parte (vedi CLAUDE.md): qui si suggeriscono solo le
// sigle già usate nei corsi, il valore memorizzato è comunque una stringa
// libera su CORSO.classeId.
export async function getClassiEsistenti() {
  const snap = await getDocs(collection(db, "corsi"));
  const classi = new Set();
  for (const d of snap.docs) {
    const c = d.data().classeId;
    if (c) classi.add(c);
  }
  return [...classi].sort((a, b) => a.localeCompare(b, "it"));
}

// Tutti i corsi dell'istituto, con il nome del docente titolare risolto — per
// la vista Admin (sola lettura). "Niente JOIN": corsi + collegamenti titolare +
// utenti, assemblati qui. Scala pilota: nessun indice, letture aperte a
// isDominio() (già così nelle rules).
export async function getTuttiICorsi() {
  const [corsiSnap, titolariSnap] = await Promise.all([
    getDocs(collection(db, "corsi")),
    getDocs(query(collection(db, "docenti_corso"), where("ruolo", "==", "titolare"))),
  ]);

  const titolareDi = new Map(); // corsoId -> docenteId
  for (const d of titolariSnap.docs) {
    const { corsoId, docenteId } = d.data();
    if (corsoId && !titolareDi.has(corsoId)) titolareDi.set(corsoId, docenteId);
  }

  const nomi = new Map(); // docenteId -> nome visibile
  await Promise.all(
    [...new Set(titolareDi.values())].map(async (id) => {
      nomi.set(id, nomeVisibile(await getUtente(id)));
    }),
  );

  return corsiSnap.docs
    .map((d) => {
      const docenteId = titolareDi.get(d.id);
      return { id: d.id, ...d.data(), titolare: docenteId ? nomi.get(docenteId) : null };
    })
    .sort(
      (a, b) =>
        (a.materia || "").localeCompare(b.materia || "", "it") ||
        (a.classeId || "").localeCompare(b.classeId || "", "it"),
    );
}

// Creazione corso "self-service" (modello Google Classroom): il docente
// autorizzato crea il proprio corso e si auto-assegna come titolare. Corso +
// riga DOCENTE_CORSO in un unico writeBatch atomico — niente corso orfano se la
// seconda scrittura fallisse. `annoScolastico` è preso da CONFIG (non passato
// dal client), coerente con "nessuna migrazione tra anni". Modifica e
// disattivazione del corso restano all'admin (rules: update/delete vietati).
// Vedi DECISIONI_DESIGN.md, "Onboarding docente e creazione corsi".
export async function creaCorso({ materia, classeId, docenteId }) {
  const nome = String(materia ?? "").trim();
  const classe = String(classeId ?? "").trim();
  if (!nome) throw new Error("La materia è obbligatoria.");
  if (!classe) throw new Error("La classe è obbligatoria.");
  if (!docenteId) throw new Error("creaCorso: docenteId mancante.");

  const config = await getConfig();
  const annoScolastico = config?.annoScolasticoCorrente;
  if (!annoScolastico) throw new Error("Anno scolastico non configurato (config/current).");

  const corsoRef = doc(collection(db, "corsi"));
  const legameRef = doc(db, "docenti_corso", `${docenteId}_${corsoRef.id}`);

  const batch = writeBatch(db);
  batch.set(corsoRef, {
    materia: nome,
    classeId: classe,
    annoScolastico,
    codiceAccesso: generaCodiceCorso(),
    creato: serverTimestamp(),
  });
  batch.set(legameRef, { docenteId, corsoId: corsoRef.id, ruolo: "titolare" });
  await batch.commit();

  return corsoRef.id;
}
