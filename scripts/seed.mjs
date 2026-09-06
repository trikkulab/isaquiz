// Popola l'emulatore Firestore con dati di prova per lo sviluppo interno.
// Idempotente: usa id fissi con set(), rilanciarlo sovrascrive senza duplicare
// (tranne i quesiti, vedi sotto). NON tocca mai un progetto Firebase reale:
// scrive solo sull'emulatore locale.
//
// Uso:  npm run emu   (in un terminale)
//       npm run seed  (in un altro)

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
const PROJECT_ID = "demo-isaquiz";

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const ANNO = "2025/26";
const DOCENTE_ID = "mock-docente-1"; // deve combaciare con data/mockAuth.js
const DOCENTE_EMAIL = "rossi@istituto.example";

// --- documenti a id fisso (idempotenti) ---------------------------------------

const config = {
  ref: db.doc("config/current"),
  data: {
    annoScolasticoCorrente: ANNO,
    docentiAutorizzati: [DOCENTE_EMAIL],
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

// Quiz di prova. `quesiti` referenzia versioni specifiche (i seed sono a -v0).
//  - quiz-prova-rinascimento: già "attivo" -> /quiz/quiz-prova-rinascimento è
//    navigabile subito, senza doverlo comporre da CreaQuiz.
//  - quiz-bozza-informatica: "bozza" -> serve a verificare il gate lato
//    studente (un quiz non avviato non è apribile).
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
];

// --- scrittura --------------------------------------------------------------

async function main() {
  const batch = db.batch();

  batch.set(config.ref, config.data);
  batch.set(utente.ref, utente.data);
  batch.set(classe.ref, classe.data);

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

  await batch.commit();

  console.log(`Seed completato su ${process.env.FIRESTORE_EMULATOR_HOST} (progetto ${PROJECT_ID}).`);
  console.log(`  config/current, utenti/${DOCENTE_ID}, classi/3A`);
  console.log(`  corsi: ${corsi.map((c) => c.id).join(", ")}`);
  console.log(`  quesiti: ${quesiti.length}`);
  for (const q of quizzes) console.log(`  quiz: ${q.id} (${q.data.stato}) — /quiz/${q.id}`);
}

main().catch((err) => {
  console.error("Seed fallito:", err);
  process.exit(1);
});
