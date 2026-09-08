// Popola Firestore con dati di prova. Idempotente: usa id fissi con set(),
// rilanciarlo sovrascrive senza duplicare (tranne i quesiti, vedi sotto).
//
// DEFAULT — emulatore locale (progetto demo-isaquiz). Non tocca nulla di reale.
//   npm run emu   (in un terminale)
//   npm run seed  (in un altro)
//
// PROGETTO REALE — interim Fase 0, SOLO dogfooding interno (vedi docs/deploy.md).
// Serve una service-account key (Console Firebase -> Impostazioni progetto ->
// Account di servizio -> "Genera nuova chiave privata"), da NON versionare.
//   SEED_TARGET=prod \
//   SEED_PROJECT_ID=<project-id> \
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//   SEED_CONFIRM=<project-id> \
//   npm run seed
// SEED_CONFIRM deve combaciare con SEED_PROJECT_ID: guardia anti-"oops".

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const TARGET = process.env.SEED_TARGET === "prod" ? "prod" : "emulator";
let PROJECT_ID;

if (TARGET === "prod") {
  PROJECT_ID = process.env.SEED_PROJECT_ID;
  if (!PROJECT_ID) {
    console.error("SEED_TARGET=prod richiede SEED_PROJECT_ID=<project-id>.");
    process.exit(1);
  }
  if (process.env.SEED_CONFIRM !== PROJECT_ID) {
    console.error(
      `Scrittura sul progetto REALE "${PROJECT_ID}": rilancia con SEED_CONFIRM=${PROJECT_ID} per confermare.`,
    );
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "SEED_TARGET=prod richiede GOOGLE_APPLICATION_CREDENTIALS=/percorso/serviceAccountKey.json.",
    );
    process.exit(1);
  }
  console.warn(`\n⚠  Seed sul progetto Firebase REALE "${PROJECT_ID}".\n`);
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
} else {
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
  PROJECT_ID = "demo-isaquiz";
  initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore();

const ANNO = "2025/26";
// Dominio istituzionale fittizio per lo sviluppo: tutte le email seed (docente
// e studenti) ne fanno parte, così il gate di dominio (client + rules) le
// accetta in emulatore. In produzione va sostituito col dominio Google
// Workspace reale — vedi docs/deploy.md e la costante in firestore.rules.
const DOMINIO = "istituto.example";
// uid Auth (emulatore) + id doc `utenti`. Storici: tenuti così per non rompere
// i riferimenti già presenti nei quiz/risposte seed (autoreId, studenteId).
const DOCENTE_ID = "mock-docente-1";
const DOCENTE_EMAIL = `rossi@${DOMINIO}`;

// --- documenti a id fisso (idempotenti) ---------------------------------------

const config = {
  ref: db.doc("config/current"),
  data: {
    annoScolasticoCorrente: ANNO,
    docentiAutorizzati: [DOCENTE_EMAIL],
    dominioIstituzionale: DOMINIO,
    nomeIstituto: "IIS Esempio",
    codiceMeccanografico: "XXIS00000X",
  },
};

const utente = {
  ref: db.doc(`utenti/${DOCENTE_ID}`),
  data: {
    email: DOCENTE_EMAIL,
    nome: "Mario",
    cognome: "Rossi",
    ruolo: "docente",
    classeId: "3A",
  },
};

// Studenti di prova. Gli id sono anche gli uid Auth nell'emulatore.
const studenti = [
  { id: "mock-studente-1", nome: "Giulia", cognome: "Bianchi", email: `giulia.bianchi@${DOMINIO}` },
  { id: "mock-studente-2", nome: "Luca", cognome: "Verdi", email: `luca.verdi@${DOMINIO}` },
].map((s) => ({
  ref: db.doc(`utenti/${s.id}`),
  data: {
    email: s.email,
    nome: s.nome,
    cognome: s.cognome,
    ruolo: "studente",
    classeId: "3A",
  },
}));

const classe = {
  ref: db.doc("classi/3A"),
  data: { nome: "3A", annoScolastico: ANNO },
};

const corsi = [
  {
    id: "informatica-3a-2526",
    data: {
      classeId: "3A",
      materia: "Informatica",
      annoScolastico: ANNO,
      codiceAccesso: "INF3A26",
    },
  },
  {
    id: "storia-3a-2526",
    data: {
      classeId: "3A",
      materia: "Storia",
      annoScolastico: ANNO,
      codiceAccesso: "STO3A26",
    },
  },
];

const docentiCorso = corsi.map((c) => ({
  id: `${DOCENTE_ID}_${c.id}`,
  data: { docenteId: DOCENTE_ID, corsoId: c.id, ruolo: "titolare" },
}));

// Quiz di prova, uno per stato (per provare i gate lato studente e le azioni
// in DocenteHome). `quesiti` referenzia versioni specifiche (i seed sono a -v0).
const quizzes = [
  {
    id: "quiz-prova-rinascimento",
    data: {
      titolo: "Verifica: il Rinascimento",
      corsoId: "storia-3a-2526",
      autoreId: DOCENTE_ID,
      quesiti: ["seed-storia-1-v0", "seed-storia-2-v0", "seed-storia-3-v0", "seed-storia-4-v0"],
      stato: "attivo",
    },
  },
  {
    id: "quiz-bozza-informatica",
    data: {
      titolo: "Bozza: basi di informatica",
      corsoId: "informatica-3a-2526",
      autoreId: DOCENTE_ID,
      quesiti: ["seed-info-1-v0", "seed-info-2-v0"],
      stato: "bozza",
    },
  },
  {
    id: "quiz-chiuso-informatica",
    data: {
      titolo: "Chiuso: array e byte",
      corsoId: "informatica-3a-2526",
      autoreId: DOCENTE_ID,
      quesiti: ["seed-info-1-v0", "seed-info-2-v0"],
      stato: "chiuso",
    },
  },
];

// Codici di accesso (collezione codici_accesso, id = il codice). Nell'app li
// genera avviaQuiz; qui sono fissi per poterli digitare in /studente durante
// i test. TEST01 -> quiz attivo (entra), TEST02 -> quiz chiuso ("è chiuso").
const codiciAccesso = [
  { id: "TEST01", quizId: "quiz-prova-rinascimento" },
  { id: "TEST02", quizId: "quiz-chiuso-informatica" },
];

// --- quesiti di prova --------------------------------------------------------
// Nota: i quesiti hanno id fisso qui sotto solo per rendere il seed idempotente.
// Nell'app i quesiti creati dal docente useranno addDoc (id auto).

const quesiti = [
  {
    id: "seed-storia-1",
    testo: "In quale città nasce il Rinascimento italiano?",
    opzioni: ["Venezia", "Firenze", "Roma", "Milano"],
    indiceCorretto: 1,
    materia: "Storia",
    argomento: "Contesto storico",
    difficolta: "media",
    spiegazione:
      "Firenze, grazie al mecenatismo di famiglie come i Medici, fu il centro propulsore del Rinascimento tra '400 e '500.",
  },
  {
    id: "seed-storia-2",
    testo: "Chi ha dipinto la Gioconda?",
    opzioni: ["Michelangelo", "Raffaello", "Leonardo da Vinci", "Botticelli"],
    indiceCorretto: 2,
    materia: "Storia",
    argomento: "Arte",
    difficolta: "facile",
    spiegazione:
      "La Gioconda (Monna Lisa) è un dipinto di Leonardo da Vinci, realizzato tra il 1503 e il 1519.",
  },
  {
    id: "seed-storia-3",
    testo: "Quale famiglia fiorentina finanziò molti artisti del Rinascimento?",
    opzioni: ["I Borgia", "I Medici", "I Visconti", "Gli Sforza"],
    indiceCorretto: 1,
    materia: "Storia",
    argomento: "Mecenatismo",
    difficolta: "media",
    spiegazione:
      "I Medici, potente famiglia di banchieri fiorentini, finanziarono artisti come Botticelli e Michelangelo.",
  },
  {
    id: "seed-storia-4",
    testo: "Cosa si intende per 'prospettiva' in pittura?",
    opzioni: [
      "Una tecnica per mescolare i colori",
      "Un modo di rappresentare la profondità sulla tela",
      "Il contorno scuro delle figure",
      "Un tipo di pennello",
    ],
    indiceCorretto: 1,
    materia: "Storia",
    argomento: "Tecniche pittoriche",
    difficolta: "media",
    spiegazione:
      "La prospettiva è la tecnica geometrica che permette di rappresentare la profondità e lo spazio tridimensionale su una superficie piana.",
  },
  {
    id: "seed-info-1",
    testo: "Quanti bit ci sono in un byte?",
    opzioni: ["4", "8", "16", "32"],
    indiceCorretto: 1,
    materia: "Informatica",
    argomento: "Rappresentazione dell'informazione",
    difficolta: "facile",
    spiegazione: "Un byte è composto da 8 bit e può rappresentare 256 valori distinti (2^8).",
  },
  {
    id: "seed-info-2",
    testo: "In un array di lunghezza N, qual è l'indice dell'ultimo elemento?",
    opzioni: ["N", "N - 1", "N + 1", "1"],
    indiceCorretto: 1,
    materia: "Informatica",
    argomento: "Strutture dati",
    difficolta: "facile",
    spiegazione:
      "Gli array sono 0-based nella maggior parte dei linguaggi: il primo elemento ha indice 0, quindi l'ultimo ha indice N - 1.",
  },
  {
    // Disattivato: per provare il toggle "Mostra inattivi" nella banca.
    // Gli altri quesiti seed NON hanno il campo `attivo` di proposito — devono
    // comunque comparire (regola: `attivo !== false`).
    id: "seed-info-3",
    testo: "Domanda mal posta (esempio di quesito disattivato)",
    opzioni: ["A", "B"],
    indiceCorretto: 0,
    materia: "Informatica",
    argomento: "Strutture dati",
    difficolta: "facile",
    spiegazione: null,
    attivo: false,
  },
];

// Risposte di prova a quiz-prova-rinascimento (corrette: 1, 2, 1, 1).
// Giulia 3/4, Luca 2/4 con l'ultimo quesito senza risposta.
const risposteProva = [
  ["mock-studente-1", "seed-storia-1-v0", 1],
  ["mock-studente-1", "seed-storia-2-v0", 2],
  ["mock-studente-1", "seed-storia-3-v0", 0],
  ["mock-studente-1", "seed-storia-4-v0", 1],
  ["mock-studente-2", "seed-storia-1-v0", 1],
  ["mock-studente-2", "seed-storia-2-v0", 0],
  ["mock-studente-2", "seed-storia-3-v0", 1],
].map(([studenteId, quesitoId, opzioneScelta]) => ({
  id: `quiz-prova-rinascimento_${studenteId}_${quesitoId}`,
  data: {
    quizId: "quiz-prova-rinascimento",
    studenteId,
    quesitoId,
    rispostaData: { opzioneScelta },
    timestamp: FieldValue.serverTimestamp(),
  },
}));

// --- utenti Auth (solo emulatore) ------------------------------------------
// In produzione gli account nascono dal login Google reale (provisioning in
// data/authProvider.js), non dal seed. In emulatore invece li creiamo qui, con
// uid = id del documento `utenti`, così si può "accedere come" un utente seed
// dalla Emulator UI e i riferimenti (autoreId, studenteId) restano validi.
async function seedUtentiAuth() {
  if (TARGET === "prod") return;
  const auth = getAuth();
  const persone = [
    { uid: DOCENTE_ID, email: DOCENTE_EMAIL, displayName: "Mario Rossi" },
    ...studenti.map((s) => ({
      uid: s.ref.id,
      email: s.data.email,
      displayName: `${s.data.nome} ${s.data.cognome}`,
    })),
  ];
  for (const p of persone) {
    const props = { ...p, emailVerified: true };
    try {
      await auth.createUser(props);
    } catch (err) {
      if (err.code === "auth/uid-already-exists" || err.code === "auth/email-already-exists") {
        await auth.updateUser(p.uid, { email: p.email, displayName: p.displayName, emailVerified: true });
      } else {
        throw err;
      }
    }
  }
  console.log(`  utenti Auth (emulatore): ${persone.map((p) => p.email).join(", ")}`);
}

// --- scrittura --------------------------------------------------------------

async function main() {
  const batch = db.batch();

  batch.set(config.ref, config.data);
  batch.set(utente.ref, utente.data);
  batch.set(classe.ref, classe.data);
  for (const s of studenti) batch.set(s.ref, s.data);

  for (const c of corsi) batch.set(db.doc(`corsi/${c.id}`), c.data);
  for (const dc of docentiCorso) batch.set(db.doc(`docenti_corso/${dc.id}`), dc.data);

  // Versionamento (vedi DECISIONI_DESIGN.md): l'id documento è `${baseId}-v${versione}`.
  // I quesiti seed partono tutti a versione 0; l'`id` qui sopra fa da baseId.
  for (const q of quesiti) {
    const { id: baseId, ...dati } = q;
    batch.set(db.doc(`quesiti/${baseId}-v0`), {
      ...dati,
      autoreId: DOCENTE_ID,
      baseId,
      versione: 0,
      condivisa: false,
      fonte: "manuale",
      creato: FieldValue.serverTimestamp(),
    });
  }

  for (const q of quizzes) {
    batch.set(db.doc(`quiz/${q.id}`), { ...q.data, creato: FieldValue.serverTimestamp() });
  }

  for (const r of risposteProva) batch.set(db.doc(`risposte/${r.id}`), r.data);
  for (const c of codiciAccesso) {
    batch.set(db.doc(`codici_accesso/${c.id}`), {
      quizId: c.quizId,
      creato: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  await seedUtentiAuth();

  const dove = TARGET === "prod" ? "progetto REALE" : `emulatore ${process.env.FIRESTORE_EMULATOR_HOST}`;
  console.log(`Seed completato su ${dove} (progetto ${PROJECT_ID}).`);
  console.log(`  config/current, utenti (1 docente + ${studenti.length} studenti), classi/3A`);
  console.log(`  corsi: ${corsi.map((c) => c.id).join(", ")}`);
  console.log(
    `  quesiti: ${quesiti.length} (di cui ${quesiti.filter((q) => q.attivo === false).length} inattivi) · risposte di prova: ${risposteProva.length}`,
  );
  for (const q of quizzes) console.log(`  quiz: ${q.id} (${q.data.stato}) — /quiz/${q.id}`);
  for (const c of codiciAccesso) console.log(`  codice: ${c.id} -> ${c.quizId}`);
}

main().catch((err) => {
  console.error("Seed fallito:", err);
  process.exit(1);
});
