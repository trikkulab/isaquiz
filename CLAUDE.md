# CLAUDE.md

Istruzioni persistenti per Claude Code su questo progetto. Letto automaticamente
a inizio sessione — tienilo aggiornato quando una decisione presa in una sessione
deve valere anche per le altre. Per il contesto esteso: `README.md` (struttura
cartelle) e `DECISIONI_DESIGN.md` (perché le cose sono fatte così).

Documenti di riferimento più estesi in `docs/` — NON leggerli per intero ad
ogni sessione, solo quando il compito lo richiede davvero:
- `docs/project-charter.md` — visione, obiettivi, criteri di successo
- `docs/analisi-gdpr.md` — consultare prima di aggiungere/modificare campi
  legati a dati personali, conservazione, condivisione tra docenti, o prima
  di collegare un provider IA esterno
- `docs/documenti-sperimentazione.md` — informative e consensi per la Fase 5
- `docs/piano-sviluppo.md` — versione estesa delle fasi (qui sotto solo lo
  stato corrente)
- `docs/isaquiz_ERD.md` - struttura del detabase

## Cos'è isaquiz

Piattaforma web per quiz in classe: il docente crea/genera domande, somministra
un quiz via QR code, gli studenti rispondono da telefono, si vedono risultati e
progressi nel tempo. Principio guida: "pochi passaggi dal contenuto della
lezione al quiz" — la semplicità d'uso è un requisito, non un nice-to-have.

## Stack

React + Vite (SPA, routing con react-router-dom) — Firebase/Firestore (regione
europe-west) — Cloud Functions solo per ciò che richiede un segreto o fiducia
(proxy IA, calcolo punteggio) — styling con Tailwind CSS v4 (plugin
`@tailwindcss/vite`, niente `tailwind.config.js`: i design token del progetto
— colori, font, ombre, animazioni — vivono in `@theme` dentro
`ui/src/index.css`). Componenti in classi utility inline, niente CSS Modules
o file `.css` per componente. shadcn/ui (o altre librerie di componenti) non ancora introdotto: da rivalutare
quando si affronta la pagina statistiche (probabile lato docente, non
studente — l'estetica di default è più "pannello" che "giocosa").

**Sviluppo locale**: quattro `package.json` — radice (tooling: `firebase-tools`,
`firebase-admin`; script `npm run emu` / `npm run seed`), `data/` (SDK
Firebase), `ui/` (React/Vite), `functions/`. Si lavora sull'**emulatore
Firestore** (progetto `demo-isaquiz`, nessun progetto Firebase reale): `npm run
emu` avvia emulatore + Emulator UI (:4000), `npm run seed` (`scripts/seed.mjs`)
popola i dati di prova, `cd ui && npm run dev`. Dettagli in `README.md`.

## Styling

**Tailwind CSS**, classi di utilità direttamente nei componenti — niente file
`.css` separati da tenere sincronizzati a mano. Non ancora shadcn/ui: se ne
riparla quando si arriva alla pagina statistiche (accordion, modale, tabs), per
ora si lavora con Tailwind puro.

- **Schermate studente (`QuizStudente`, `BarraQuiz`, `QuesitoCard`)**: qui c'è
  libertà di giudizio estetico — target sono studenti giovani, quindi
  l'interfaccia deve risultare moderna, accattivante, viva (non uno stile
  "form aziendale"), pur restando pulita e velocissima da usare. Va bene
  osare un po' di più con colori, micro-animazioni Tailwind (transizioni su
  hover/tap, feedback visivo immediato su risposta corretta/sbagliata), senza
  però appesantire il caricamento su connessioni scolastiche incerte.
- **Schermate docente e statistiche**: stile più sobrio, funzionale — priorità
  a leggibilità e densità di informazione piuttosto che a effetti visivi.
  Decisioni di dettaglio rimandate a quando si affronta quella parte.

## Modello dati: ruoli e corsi (leggere prima di toccare auth/permessi)

- **Tabella `UTENTE` unica**, niente `STUDENTE`/`DOCENTE` separate. Contiene
  email, nome, cognome, un campo `ruolo` (cache di comodo per la dashboard di
  default) e `classeId` (rilevante solo se studente).
- **Il campo `ruolo` su `UTENTE` non è mai la fonte di verità per un corso
  specifico.** Per sapere cosa è una persona in un dato corso, si legge sempre
  la riga di collegamento pertinente: `ISCRIZIONE_CORSO` (studente),
  `DOCENTE_CORSO` con `ruolo: titolare|assistente` (docente in quel corso),
  `DOCENTE_CLASSE` con `ruolo: coordinatore`. Non dedurre mai il ruolo in un
  contesto specifico dal campo generale su `UTENTE`.
- **`CORSO`, non `CLASSE`, è il contenitore dei quiz.** Un corso è per
  combinazione materia+classe+anno scolastico (es. "Informatica 3AINF
  2025/26"), con proprio `codiceAccesso`. `CLASSE` esiste come entità
  amministrativa separata (per la vista coordinatore), NON come contenitore di
  quiz.
- **Vista coordinatore: schema sì, funzionalità NO prima della Fase 4/5.** Le
  tabelle (`DOCENTE_CLASSE`, `ISCRIZIONE_CLASSE`) esistono già, ma nessuna
  query/vista aggregata cross-materia va scritta prima che sia stata fatta la
  DPIA (vedi `docs/analisi-gdpr.md`, sezione 6). Se un task sembra richiedere
  "far vedere al coordinatore i dati di più materie insieme", fermarsi e
  chiederne conferma esplicita, non è coperto dall'MVP.
- **Ruolo docente assegnato per lista, mai autoregistrazione.** Al login si
  controlla se l'email è in `CONFIG.docentiAutorizzati`; se sì ruolo docente,
  altrimenti resta studente. Controllo ad ogni login, non solo al primo.
  Nessun bottone/flusso "diventa docente" dentro l'app.
- **Ruolo `admin`**: mai assegnabile da dentro l'app, solo scrivendolo
  direttamente su Firestore. Dà accesso a un cruscotto minimale (gestione
  lista docenti autorizzati, elenco corsi, disattivazione corso) — non un
  workflow di approvazione con notifiche/coda.
- **Nessuna migrazione dati tra anni scolastici.** Cambio anno, promozione,
  bocciatura: si creano nuove righe, quelle vecchie non si toccano mai.
  `CONFIG` contiene l'anno scolastico corrente, usato per invalidare i codici
  di accesso delle annate precedenti.
- **Un istituto per installazione, non multi-tenant.** `CONFIG.nomeIstituto` /
  `CONFIG.codiceMeccanografico` identificano quale istituto sta usando questa
  istanza — non esiste (né è previsto) un campo di scoping per istituto sulle
  altre entità. Un secondo istituto = una seconda installazione separata
  (proprio progetto Firebase, proprio `CONFIG`, proprio dominio Google), non
  una funzionalità multi-tenant nella stessa istanza. Vedi
  `DECISIONI_DESIGN.md`, "Multi-istituto".

## Regole architetturali fisse — non violarle senza discuterne esplicitamente

- **Nessun componente in `ui/` accede a Firestore direttamente.** Sempre tramite
  i moduli in `data/` (`quizRepository.js`, `quesitiRepository.js`,
  `corsiRepository.js`, `utentiRepository.js`, `risposteRepository.js`,
  `codiciAccessoRepository.js`). I repository possono chiamarsi tra loro per
  assemblare (es. `getQuizConQuesiti` legge quiz + quesiti + corso + utente).
  Se un componente ha bisogno
  di un nuovo modo di leggere/scrivere dati, si aggiunge una funzione al
  repository giusto, non una chiamata Firestore inline. Anche le
  sottoscrizioni live (`onSnapshot`) passano dal repository: funzione
  `ascolta*` che riceve callback e ritorna la funzione di annullamento (il
  componente la chiama nel cleanup di `useEffect`). L'SDK Firebase è
  dipendenza di `data/package.json` (non di `ui/`); `data/firebaseClient.js` è
  l'unico `initializeApp()` e si collega all'emulatore quando
  `VITE_USE_FIRESTORE_EMULATOR === "true"`.
- **Mock auth attiva** (`data/mockAuth.js`, funzione `getUtenteCorrente()`).
  NON collegare Firebase Auth reale finché non richiesto esplicitamente — è un
  task pianificato per la Fase 2, non da anticipare. Nessuno studente deve
  usare la piattaforma prima che il login vero sia attivo.
- **Il campo `corretta` su una risposta non si scrive mai dal client.** Il
  client scrive solo la risposta grezza (`saveAnswer`); il calcolo e la
  scrittura di `corretta` sono responsabilità esclusiva di
  `functions/calcolaPunteggio.js`, lato server.
- **`QuizRisultati.jsx` è "contenuto puro".** Non deve mai assumere di essere
  montato come pagina intera, dentro un modale, o inline in un pannello — chi
  lo monta decide il contenitore. Non aggiungerci logica di navigazione o
  layout specifica di un contesto.
- **Niente JOIN mentali col vecchio schema relazionale.** `quiz.quesiti` è un
  array di ID dentro il documento quiz. `risposte` è una collezione top-level
  (non sotto-collezione di quiz), **una `RISPOSTA` per documento** (id
  `quizId_studenteId_quesitoId`), non aggregata per studente-quiz — proprio
  per poter interrogare "tutte le risposte di uno studente nel tempo"
  trasversalmente ai quiz, per le security rules su `corretta`, e per la
  migrazione a un DB relazionale (vedi `DECISIONI_DESIGN.md`, "Modello dati:
  le risposte"). Query composte su più entità = letture
  separate assemblate nel codice del repository, non una query sola.
- **"Quesito" (non "domanda"), "opzioni" (non "risposte") per le sue
  alternative.** "Risposta" è già l'entità distinta di cosa lo studente ha
  scelto — vedi `DECISIONI_DESIGN.md`, "Terminologia", prima di introdurre
  nuovi nomi in quest'area.
- **Punteggio nelle liste è sempre contestuale, mai il totale del quiz** (es.
  "3/4 su questo argomento"). Il totale del quiz si vede solo aprendo la
  correzione completa.
- **Layout adattivo, non solo responsive.** Sopra ~960px (soglia in
  `useBreakpoint.js`, da verificare a occhio, non sacra) alcune schermate si
  riorganizzano davvero (es. statistiche: accordion+modale sotto la soglia,
  pannello master-detail sopra), non solo si allargano. Il contenuto resta lo
  stesso componente in entrambi i casi.
- **Generazione IA (Fase 3): mai testo con dati di studenti specifici** nel
  prompt inviato al provider — solo appunti/argomenti del docente. La chiave
  API del provider vive solo in `functions/aiProvider.js` lato server, mai nel
  client. Ogni quesito generato resta in stato di bozza finché il docente non
  lo valida esplicitamente ("human in the loop": mai pubblicare quesiti IA
  senza revisione).
- **Un quesito non si modifica mai in place.** L'id è `baseId-vN` (N intero,
  senza padding); modificare crea sempre la versione successiva. Se l'utente
  corrente è l'autore, la nuova versione resta sotto lo stesso `baseId`; se
  non lo è (quesito preso dalla banca condivisa), la modifica crea un
  `baseId` nuovo con l'utente corrente come autore (fork). La banca quesiti
  in UI mostra e permette di modificare solo l'ultima versione per `baseId`;
  le versioni precedenti restano raggiungibili solo per id esatto, da un
  `quiz.quesiti` che le referenzia — mai in banca, mai in ricerca. Regola
  completa e motivazione in `DECISIONI_DESIGN.md`, "Versionamento dei
  quesiti".
- **`QUIZ.stato`: `bozza` → `attivo` ⇄ `chiuso` → (eventuale) `archiviato`.**
  `bozza` è modificabile e cancellabile (delete fisico). Dalla pubblicazione
  (`bozza → attivo`, generazione del QR) in poi il **contenuto è immutabile e
  permanente** — coerente con "nessuna riga storica si sovrascrive". `attivo`
  accetta risposte; `chiuso` no ma è **reversibile** (`riapriQuiz`, per i
  ritardatari) — è l'unica differenza tra i due, il contenuto resta bloccato.
  Lo studente apre solo quiz `attivo`. Per riusare un quiz (altra classe,
  variante) si **duplica** in una nuova bozza, mai si modifica l'originale.
  Regola completa in `DECISIONI_DESIGN.md`, "Stati del quiz".

## Stato attuale del progetto

Siamo alla **coda della Fase 0** (setup iniziale) del piano di sviluppo:

- [x] Struttura cartelle `/ui`, `/data`, `/functions`
- [x] Mock auth (stub funzionante in `data/mockAuth.js`)
- [x] Collezioni Firestore create con dati di prova — **in emulatore**:
      `npm run emu` (radice) avvia l'emulatore Firestore, `npm run seed` lo
      popola (`scripts/seed.mjs`: `config`, `utenti`, `classi`, `corsi`,
      `docenti_corso`, `quesiti`). Client puntato all'emulatore con
      `VITE_USE_FIRESTORE_EMULATOR=true` in `ui/.env`. Progetto ancora
      `demo-*` (nessun progetto Firebase reale), `firestore.rules` è un
      placeholder aperto valido solo in locale.
- [ ] Hosting statico configurato (GitHub Pages o Cloudflare Pages)

**Fase 1 (somministrazione quiz), lato studente completo su dati mock:**

- [x] `ui/src/pages/QuizStudente.jsx` — svolgimento quiz, un quesito alla
      volta, feedback immediato ✓/✗, nessun tasto indietro, avanzamento
      automatico configurabile (`config/impostazioniQuiz.js`) con riempimento
      progressivo e interruzione al tap (`components/BottoneAvanti.jsx`)
- [x] `ui/src/components/BarraQuiz.jsx` — header con identità studente, quiz,
      livello (solo display), barra di avanzamento a segmenti
- [x] `ui/src/components/QuesitoCard.jsx` — riusato in due modalità
      (`"quiz"` e `"correzione"`)
- [x] `ui/src/pages/QuizRisultati.jsx` — correzione completa ("contenuto
      puro"): riceve `quiz` + `risposte` come **prop** (niente più
      `useLocation` interno).
- [x] `ui/src/pages/QuizRisultatiPagina.jsx` — contenitore (route
      `/quiz/:quizId/risultati`): usa lo `state` di navigazione se presente,
      altrimenti rilegge da Firestore (`getQuizConQuesiti` +
      `getRisposteStudente`) per link diretto / refresh. Monta
      `components/CreditoTecnico.jsx`.
- [x] `ui/src/pages/RisultatiDocente.jsx` (route
      `/docente/quiz/:quizId/risultati`) — tabella studente × punteggio +
      "per quesito" (corrette/risposte), **in tempo reale**
      (`ascoltaRisposteQuiz` → `onSnapshot`). Punteggio calcolato lato client;
      nomi studenti in cache; guardia anti-race tra update ravvicinati.
- [x] `QuizStudente.jsx` cablato su Firestore (`getQuizConQuesiti(quizId)`),
      niente più `QUIZ_MOCK`. Stati loading / "non trovato" / "non ancora
      avviato" (`bozza`) / "chiuso" (`chiuso`) / "non più disponibile"
      (`archiviato`) / "senza quesiti". `saveAnswer` scrive davvero su
      `risposte` (fire-and-forget). `BarraQuiz`/`QuizRisultati` mostrano
      `materia · docente` solo se presenti.
- [x] `ui/src/pages/StudenteHome.jsx` (route `/studente`) — mini-dashboard
      studente (mock auth): "Partecipa a un quiz" → campo codice
      (`normalizzaCodice` live, **nessun controllo di lunghezza**: basta non
      vuoto) → `getQuizIdDaCodice` → `navigate('/quiz/:quizId')` o "Codice non
      valido"; link alle statistiche. Diventerà la pagina post-login (Fase 2).
- [x] `data/quizRepository.js` (`getQuiz`; `getQuizConQuesiti` — quesiti in
      ordine + materia dal corso + docente dall'autore, "niente JOIN";
      `getQuizDocente` — meta + materia, ordinati per data; `creaQuiz` →
      `stato: "bozza"`; `aggiornaQuizBozza` / `eliminaQuiz` — consentite SOLO
      se `stato: bozza`; `duplicaQuiz` — da qualsiasi quiz crea una nuova
      bozza (id quesiti copiati, nessun legame con l'originale); `avviaQuiz`
      (`bozza → attivo` + genera il codice di accesso), `chiudiQuiz`
      (`attivo → chiuso`), `riapriQuiz` (`chiuso → attivo`) — a senso obbligato),
      `data/quesitiRepository.js`, `data/corsiRepository.js` (`getCorso`,
      `getCorsiDocente`), `data/utentiRepository.js` (`getUtente`,
      `nomeVisibile`), `data/risposteRepository.js` (`saveAnswer` — id
      deterministico `quizId_studenteId_quesitoId`, mai `corretta`;
      `getRisposteQuiz(quizId)` tutte; `getRisposteStudente(quizId,
      studenteId)`; `ascoltaRisposteQuiz(quizId, onDati, onErrore)` — live
      via `onSnapshot`, ritorna l'unsubscribe), nuovo `data/codiciAccessoRepository.js` (collezione
      `codici_accesso`, id = codice: `getQuizIdDaCodice`, `getCodiceQuiz`,
      `generaCodiceQuiz` idempotente, `normalizzaCodice` pura (clemenza
      Crockford + **allowlist** all'alfabeto → output sempre id-doc valido);
      Crockford Base32, la lunghezza (oggi 6) è parametro di sola generazione
      in un unico punto — tutto il resto è length-agnostic; generazione
      client-side con micro-race accettata — vedi `DECISIONI_DESIGN.md`,
      "Codice di accesso ai quiz").
      Versionamento quesiti (id `baseId-vN`, campo `versione`): `getBancaDocente`
      (ex `getQuesitiDocente`) raggruppa per `baseId` e ritorna solo l'ultima
      versione; `getQuesito(id)` risolve qualsiasi versione esatta;
      `creaQuesito` (baseId nuovo, v0), `salvaNuovaVersione` (stesso baseId,
      +1), `forkQuesito` (baseId nuovo, autore corrente); `idProssimaVersione`
      (pura). Tutte scrivono `fonte: "manuale"`. Restano stub: `archiviaQuiz`,
      `getStatistichePerArgomento` / `getQuizPerArgomento` (Fase 4/5). Seed:
      un quiz per stato (`quiz-prova-rinascimento` attivo con 7 risposte di 2
      studenti + codice `TEST01`; `quiz-bozza-informatica`;
      `quiz-chiuso-informatica` + codice `TEST02`).
- [ ] `functions/calcolaPunteggio.js` resta uno stub: il calcolo di
      giusto/sbagliato è ancora lato client, rischio noto e accettato per ora
      (vedi `DECISIONI_DESIGN.md`, "Flusso quiz studente")
- [x] `CreaQuiz.jsx` — comporre un quiz: selettore corso, banca quesiti con
      ricerca/filtro (materia, argomento) e contenitore ridimensionabile, form
      quesito, aggiungi/rimuovi dal quiz. Click sulla card di un quesito → lo
      carica nel form (contenuto editabile, materia/versione/autore in sola
      lettura); i bottoni diventano "Salva nuova versione" + "Duplica come
      nuovo quesito" (autore = utente) o "Duplica come mio quesito" (autore
      diverso — branch per ora irraggiungibile finché non c'è
      `getQuesitiCondivisi`, Fase 4). "Salva bozza" → pannello con "Pubblica e
      avvia il quiz" (conferma inline → `avviaQuiz`) → `components/AccessoQuiz.jsx`
      (codice di accesso + QR `qrcode.react` + link `/quiz/{id}` con "Copia";
      il codice lo recupera da sé con `getCodiceQuiz`), riusato in DocenteHome.
      Dopo salva/avvia: link "I miei quiz".
- [x] `CreaQuiz.jsx` modifica bozza: route `/docente/crea-quiz/:quizId`
      (opzionale) carica titolo/corso/quesiti di una bozza esistente; al
      salvataggio `aggiornaQuizBozza` invece di `creaQuiz`. I quesiti del quiz
      vengono "aggiornati" all'ultima versione del loro `baseId` al caricamento
      (con avviso), coerente con "una bozza si compone dalla banca corrente".
      Blocca se il quiz non è più in bozza o è di un altro docente.
- [x] `DocenteHome.jsx` (route `/docente`) — elenco dei propri quiz
      (`getQuizDocente`) con badge di stato, "Crea nuovo quiz", e per riga:
      bozza → "Pubblica e avvia" / "Modifica" (→ `crea-quiz/:id`) / "Elimina"
      (conferme inline); attivo → "Risultati" / "Link e QR" (`AccessoQuiz`) /
      "Chiudi"; chiuso → "Risultati" / "Link e QR" / "Riapri"; attivo/chiuso →
      "Duplica" (→ modifica subito la copia).
- [ ] Ancora da fare lato docente: chiusura automatica a tempo (`chiudeAlle`);
      `archiviaQuiz`; la pagina statistiche vera (per-argomento, adattiva —
      Fase 4/5). Generazione del codice di accesso da irrobustire (transazione
      / Cloud Function) con auth/functions, Fase 2.

**Con questo la Fase 1 (somministrazione quiz, MVP) è di fatto completa** sul
piano funzionale: docente crea → compone → pubblica (codice/QR) → studente
entra e risponde → docente vede i risultati in tempo reale. Resta lato server
`functions/calcolaPunteggio.js` (stub, calcolo client) e resta l'MVP
inutilizzabile con studenti veri finché non c'è il login (Fase 2).

Due strade, da affrontare in sessioni separate:
- **Coda Fase 0 — hosting statico** (GitHub/Cloudflare Pages): sblocca QR/link
  e codice (oggi `window.location.origin` = `localhost`), permette la prima
  prova end-to-end su dispositivi reali. Richiede un progetto Firebase reale
  (regole permissive nell'interim — solo dogfooding, niente studenti).
- **Fase 2 — login vero** (Firebase Auth + Google, dominio istituzionale,
  mock auth rimossa, security rules reali). È il cancello prima di qualsiasi
  uso con studenti; sistema anche la micro-race del codice e `corretta`
  server-side.

## Cosa NON fare in questa fase

Non anticipare Fase 2 (login vero), Fase 3 (IA), Fase 4 (banca dati condivisa e
badge) mentre si lavora sull'MVP di somministrazione — sono volutamente
rimandate, vedi "Cosa resta fuori dal primo rilascio" nel piano di sviluppo.

