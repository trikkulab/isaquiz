// Popola Firestore con dati di prova. Idempotente: usa id fissi con set(),
// rilanciarlo sovrascrive senza duplicare (tranne i quesiti, vedi sotto).
//
// DEFAULT — emulatore locale (progetto demo-isaquiz). Non tocca nulla di reale.
//   npm run emu   (in un terminale)
//   npm run seed  (in un altro)
//
// PROGETTO REALE (vedi docs/deploy.md). Serve una service-account key (Console
// Firebase -> Impostazioni progetto -> Account di servizio -> "Genera nuova
// chiave privata"), da NON versionare.
//   SEED_TARGET=prod \
//   SEED_PROJECT_ID=<project-id> \
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//   SEED_CONFIRM=<project-id> \
//   npm run seed
// SEED_CONFIRM deve combaciare con SEED_PROJECT_ID: guardia anti-"oops".
//
// SEED_SOLO_CONFIG=true  -> scrive SOLO config/current + config/istituto (niente
//   dati demo: utenti, classi, corsi, quesiti, quiz). È la modalità giusta per
//   un progetto reale in cui i docenti creeranno da sé corsi e quiz.
//   SEED_DOCENTI="a@x,b@x" -> imposta l'intera lista docentiAutorizzati (default:
//   la sola SEED_DOCENTE_EMAIL). Sovrascrive: gestiscila poi a mano da console.

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const TARGET = process.env.SEED_TARGET === "prod" ? "prod" : "emulator";
const SOLO_CONFIG = process.env.SEED_SOLO_CONFIG === "true";
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
const auth = getAuth();

const ANNO = "2025/26";
// Dominio istituzionale: tutte le email seed (docente e studenti) ne fanno
// parte, così il gate di dominio (client + rules) le accetta. Deve combaciare
// con la costante `dominioIstituzionale()` in firestore.rules. Override con
// SEED_DOMINIO (es. per un'istanza demo con un dominio diverso).
const DOMINIO = (process.env.SEED_DOMINIO || "isarome.it").toLowerCase();

// Email del docente demo. Override con SEED_DOCENTE_EMAIL per intestare i dati
// demo all'account con cui si fa davvero login (utile in locale col login reale,
// e in prod per il dogfooding).
const DOCENTE_EMAIL = (process.env.SEED_DOCENTE_EMAIL || `rossi@${DOMINIO}`).toLowerCase();

// Lista docentiAutorizzati da scrivere in config/current. Default: la sola
// SEED_DOCENTE_EMAIL. Override con SEED_DOCENTI (email separate da virgola).
const DOCENTI = (process.env.SEED_DOCENTI || DOCENTE_EMAIL)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// uid del docente demo = id del documento `utenti` + autoreId di quiz/quesiti.
//  - emulatore: uid fisso "mock-docente-1" (l'utente Auth lo crea seedUtentiAuth);
//    se SEED_DOCENTE_EMAIL punta a un account già esistente, si usa quello.
//  - prod: si cerca l'account per email (il docente deve aver fatto login almeno
//    una volta, così il provisioning ha creato l'account).
// In SOLO_CONFIG non serve: si scrive solo config, nessun dato intestato.
let DOCENTE_ID = "mock-docente-1";
if (!SOLO_CONFIG) {
  try {
    DOCENTE_ID = (await auth.getUserByEmail(DOCENTE_EMAIL)).uid;
  } catch {
    if (TARGET === "prod") {
      console.error(
        `Nessun account per ${DOCENTE_EMAIL}. Il docente deve fare login almeno una volta prima del seed (oppure passa SEED_DOCENTE_EMAIL, o SEED_SOLO_CONFIG=true).`,
      );
      process.exit(1);
    }
    // emulatore: l'account verrà creato più avanti con uid "mock-docente-1".
  }
}

// --- documenti a id fisso (idempotenti) ---------------------------------------

const NOME_ISTITUTO = process.env.SEED_NOME_ISTITUTO || "IS Saraceno Romegialli";

const config = {
  ref: db.doc("config/current"),
  data: {
    annoScolasticoCorrente: ANNO,
    docentiAutorizzati: DOCENTI,
    dominioIstituzionale: DOMINIO,
    nomeIstituto: NOME_ISTITUTO,
    codiceMeccanografico: "XXIS00000X",
  },
};

// Sotto-documento pubblico (leggibile senza login, vedi firestore.rules):
// dominio + nome, usati dalla pagina di accesso prima che ci sia una sessione.
const configIstituto = {
  ref: db.doc("config/istituto"),
  data: { dominioIstituzionale: DOMINIO, nomeIstituto: NOME_ISTITUTO },
};

// Nota: `utenti.ruolo` NON è più scritto dal provisioning (vedi
// data/authProvider.js) — è un campo solo-DB che designa l'admin. Il docente lo
// è perché la sua email è in `docentiAutorizzati`, non per un campo qui.
const utente = {
  ref: db.doc(`utenti/${DOCENTE_ID}`),
  data: {
    email: DOCENTE_EMAIL,
    nome: "Mario",
    cognome: "Rossi",
    classeId: "3A",
  },
};

// Utente demo di sola amministrazione: `ruolo: "admin"` (in prod si assegna a
// mano da console — qui è nel seed per provare l'area Admin in emulatore). NON è
// in docentiAutorizzati: vede quindi Studente + Admin, non Docente.
const ADMIN_ID = "mock-admin-1";
const ADMIN_EMAIL = `admin@${DOMINIO}`;
const admin = {
  ref: db.doc(`utenti/${ADMIN_ID}`),
  data: {
    email: ADMIN_EMAIL,
    nome: "Anna",
    cognome: "Conti",
    ruolo: "admin",
  },
};

// Studenti di prova. Gli id sono anche gli uid Auth nell'emulatore.
// mock-studente-3 esiste solo per la demo di "Andamento studente" (vista
// docente): serve un terzo studente per mostrare il segnale "debolezza
// persistente" accanto a "calo" e "miglioramento" — vedi risposteAndamento.
const studenti = [
  { id: "mock-studente-1", nome: "Giulia", cognome: "Bianchi", email: `giulia.bianchi@${DOMINIO}` },
  { id: "mock-studente-2", nome: "Luca", cognome: "Verdi", email: `luca.verdi@${DOMINIO}` },
  { id: "mock-studente-3", nome: "Marco", cognome: "Neri", email: `marco.neri@${DOMINIO}` },
].map((s) => ({
  ref: db.doc(`utenti/${s.id}`),
  data: {
    email: s.email,
    nome: s.nome,
    cognome: s.cognome,
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
      avviato: Timestamp.fromDate(new Date("2025-10-06T09:00:00")),
    },
  },
  {
    // Secondo quiz di informatica ATTIVO: serve alle "Statistiche studente" per
    // avere un argomento toccato da più quiz (drill-down non banale) e due
    // materie distinte (Storia + Informatica -> FiltroMaterie visibile).
    id: "quiz-attivo-informatica",
    data: {
      titolo: "Ripasso: bit e indici",
      corsoId: "informatica-3a-2526",
      autoreId: DOCENTE_ID,
      quesiti: ["seed-info-1-v0", "seed-info-2-v0"],
      stato: "attivo",
      avviato: Timestamp.fromDate(new Date("2025-10-13T09:00:00")),
    },
  },
  // I tre quiz seguenti esistono solo per la demo di "Andamento studente"
  // (vista docente, DECISIONI_DESIGN.md): calcolaTrendMateria richiede
  // almeno 4 quiz per corso-studente, quindi ne servono >=4 in sequenza
  // temporale (`avviato` esplicito, non serverTimestamp — altrimenti tutti i
  // quiz dello stesso batch avrebbero lo stesso istante e l'ordine
  // cronologico sarebbe indeterminato). Vedi risposteAndamento sotto per le
  // sequenze di punteggio che fanno scattare i tre segnali.
  {
    id: "quiz-info-3",
    data: {
      titolo: "Verifica: rappresentazione dati",
      corsoId: "informatica-3a-2526",
      autoreId: DOCENTE_ID,
      quesiti: ["seed-info-1-v0", "seed-info-2-v0"],
      stato: "chiuso",
      avviato: Timestamp.fromDate(new Date("2025-10-20T09:00:00")),
    },
  },
  {
    id: "quiz-info-4",
    data: {
      titolo: "Ripasso: array e indici",
      corsoId: "informatica-3a-2526",
      autoreId: DOCENTE_ID,
      quesiti: ["seed-info-1-v0", "seed-info-2-v0"],
      stato: "chiuso",
      avviato: Timestamp.fromDate(new Date("2025-10-27T09:00:00")),
    },
  },
  {
    id: "quiz-info-5",
    data: {
      titolo: "Verifica: byte e strutture",
      corsoId: "informatica-3a-2526",
      autoreId: DOCENTE_ID,
      quesiti: ["seed-info-1-v0", "seed-info-2-v0"],
      stato: "attivo",
      avviato: Timestamp.fromDate(new Date("2025-11-03T09:00:00")),
    },
  },
];

// Codici di accesso (collezione codici_accesso, id = il codice). Nell'app li
// genera avviaQuiz; qui sono fissi per poterli digitare in /studente durante
// i test. TEST01 -> quiz attivo (entra), TEST02 -> quiz chiuso ("è chiuso").
const codiciAccesso = [
  { id: "TEST01", quizId: "quiz-prova-rinascimento" },
  { id: "TEST02", quizId: "quiz-chiuso-informatica" },
  { id: "TEST03", quizId: "quiz-attivo-informatica" },
  { id: "TEST04", quizId: "quiz-info-3" },
  { id: "TEST05", quizId: "quiz-info-4" },
  { id: "TEST06", quizId: "quiz-info-5" },
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

// Risposte di prova su Storia — Tuple [quizId, studenteId, quesitoId, opzioneScelta].
// quiz-prova-rinascimento (corrette: 1,2,1,1): Giulia 3/4, Luca 2/4 (ultimo
// quesito senza risposta).
const risposteStoria = [
  ["quiz-prova-rinascimento", "mock-studente-1", "seed-storia-1-v0", 1],
  ["quiz-prova-rinascimento", "mock-studente-1", "seed-storia-2-v0", 2],
  ["quiz-prova-rinascimento", "mock-studente-1", "seed-storia-3-v0", 0],
  ["quiz-prova-rinascimento", "mock-studente-1", "seed-storia-4-v0", 1],
  ["quiz-prova-rinascimento", "mock-studente-2", "seed-storia-1-v0", 1],
  ["quiz-prova-rinascimento", "mock-studente-2", "seed-storia-2-v0", 0],
  ["quiz-prova-rinascimento", "mock-studente-2", "seed-storia-3-v0", 1],
];

// Risposte di prova su Informatica: 5 quiz in sequenza cronologica (vedi
// `avviato` sui quiz sopra), una sequenza di punteggio % per studente,
// pensate per far scattare i tre segnali di calcolaTrendMateria (richiede
// >=4 quiz) — demo di "Andamento studente" (vista docente). Con soli 2
// quesiti per quiz l'unica percentuale intermedia possibile è 50% (un
// quesito giusto, uno sbagliato): basta a dimostrare l'algoritmo, non serve
// altra granularità.
const QUIZ_INFORMATICA_ANDAMENTO = [
  "quiz-chiuso-informatica",
  "quiz-attivo-informatica",
  "quiz-info-3",
  "quiz-info-4",
  "quiz-info-5",
];
const PERCENTUALI_ANDAMENTO = {
  "mock-studente-1": [100, 100, 50, 0, 0], // Giulia -> calo
  "mock-studente-2": [0, 0, 50, 100, 100], // Luca -> miglioramento
  "mock-studente-3": [50, 0, 50, 0, 50], // Marco -> debolezza persistente
};
const risposteAndamento = Object.entries(PERCENTUALI_ANDAMENTO).flatMap(
  ([studenteId, percentuali]) =>
    percentuali.flatMap((perc, i) => {
      const quizId = QUIZ_INFORMATICA_ANDAMENTO[i];
      return [
        [quizId, studenteId, "seed-info-1-v0", perc >= 50 ? 1 : 0],
        [quizId, studenteId, "seed-info-2-v0", perc >= 100 ? 1 : 0],
      ];
    }),
);

const risposteProva = [...risposteStoria, ...risposteAndamento].map(
  ([quizId, studenteId, quesitoId, opzioneScelta]) => ({
    id: `${quizId}_${studenteId}_${quesitoId}`,
    data: {
      quizId,
      studenteId,
      quesitoId,
      rispostaData: { opzioneScelta },
      timestamp: FieldValue.serverTimestamp(),
    },
  }),
);

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
    { uid: ADMIN_ID, email: ADMIN_EMAIL, displayName: "Anna Conti" },
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
  if (SOLO_CONFIG) {
    const b = db.batch();
    b.set(config.ref, config.data);
    b.set(configIstituto.ref, configIstituto.data);
    await b.commit();
    const dove = TARGET === "prod" ? "progetto REALE" : `emulatore ${process.env.FIRESTORE_EMULATOR_HOST}`;
    console.log(`Seed SOLO_CONFIG su ${dove} (progetto ${PROJECT_ID}).`);
    console.log(`  config/current + config/istituto`);
    console.log(`  istituto: "${NOME_ISTITUTO}" · dominio: ${DOMINIO} · anno: ${ANNO}`);
    console.log(`  docentiAutorizzati: ${DOCENTI.join(", ")}`);
    console.log(`  (nessun dato demo. codiceMeccanografico da controllare a mano in console)`);
    return;
  }

  const batch = db.batch();

  batch.set(config.ref, config.data);
  batch.set(configIstituto.ref, configIstituto.data);
  batch.set(utente.ref, utente.data);
  // L'admin demo serve solo a provare l'area Admin in emulatore: in prod
  // creerebbe un `utenti/mock-admin-1` con `ruolo: admin` senza account Auth —
  // orfano e fuorviante. Il ruolo admin, in prod, si assegna a mano da console.
  if (TARGET !== "prod") batch.set(admin.ref, admin.data);
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
  console.log(
    `  config/current, utenti (1 docente${TARGET !== "prod" ? " + 1 admin" : ""} + ${studenti.length} studenti), classi/3A`,
  );
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
