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

**Colore = informazione, e mai hard-coded.** Tutti i colori sono token
`--color-*` in `@theme` (`ui/src/index.css`), con nomi di **ruolo** non di
tinta. Serve un colore nuovo → si aggiunge un token lì, non un hex in un
componente. Ogni ruolo un token solo (concetti diversi non condividono un
token anche a parità di valore oggi). Il colore non è mai l'unico segnale di
uno stato: accanto c'è sempre l'etichetta. Dark theme predisposto ma non
attivo (blocco `@media` commentato in `index.css`). Regola completa, tabella
dei ruoli ed eccezioni ammesse in `DECISIONI_DESIGN.md`, "Sistema colore".

**Colore-identità (materia) vs colore-stato (padronanza, stato quiz).**
`coloreMateria(nome)` (bordo sinistro, 10-12 token) solo per insiemi a bassa
cardinalità (le materie di una persona); gli argomenti restano distinti
dalla struttura, non dal colore — per loro un colore-stato a 2-4 valori
fissi (es. padronanza bassa/media/alta). Dettaglio in `DECISIONI_DESIGN.md`,
"Sistema colore".

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
  email, nome, cognome, `classeId` (rilevante solo se studente) e un campo
  `ruolo`.
- **`UTENTE.ruolo` è un campo *solo-DB*: lo scrive SOLO la console (Admin SDK),
  MAI il client** (il provisioning non lo tocca, le rules lo vietano). Designa
  l'amministratore (`ruolo === 'admin'`) e basta — per gli altri utenti di
  norma non è nemmeno presente. Essere **docente** si deriva a runtime da
  `config/current.docentiAutorizzati` (`isDocente`), non da questo campo.
- **`ruolo` non è mai la fonte di verità per un corso specifico.** Per sapere
  cosa è una persona in un dato corso, si legge sempre la riga di collegamento:
  `ISCRIZIONE_CORSO` (studente), `DOCENTE_CORSO` con `ruolo: titolare|assistente`,
  `DOCENTE_CLASSE` con `ruolo: coordinatore`. (Il campo `ruolo` su quelle righe
  è un'altra cosa: il ruolo *nel collegamento*, non su `UTENTE`.)
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
  l'unico `initializeApp()` ed esporta `db`, `auth`, `functions`; si collega
  agli emulatori (Firestore + Auth + Functions) quando
  `VITE_USE_FIRESTORE_EMULATOR === "true"`.
- **Auth reale (Fase 2 — fatta).** Firebase Auth + Google, ristretto al dominio
  istituzionale. Layer in `data/authProvider.js` (`accediConGoogle`, `esci`,
  `ascoltaUtenteCorrente`): nessun componente `ui/` tocca Firebase Auth
  direttamente. Al login (ogni volta, non solo il primo) si fa provisioning di
  `utenti/{uid}` coi dati Google e si **calcola** (in memoria, non su Firestore)
  `isDocente` da `config/current.docentiAutorizzati` e `isAdmin` da
  `utenti/{uid}.ruolo === 'admin'`. Il provisioning **non scrive `ruolo`**. In
  UI: `ui/src/auth/AuthContext.jsx` (`useUtenteCorrente`/`useAuth`, che espone
  `isDocente`/`isAdmin`) + `RichiediAuth` sulle route. Mai reintrodurre un
  flusso "diventa docente". `data/mockAuth.js` non esiste più.
- **Tre aree indipendenti (Studente / Docente / Admin), non una gerarchia.**
  Studente = ogni utente autenticato; Docente = `isDocente` (email in
  `docentiAutorizzati`, calcolato a runtime); Admin = `isAdmin`
  (`utenti/{uid}.ruolo === 'admin'`, campo scritto solo da console). Combinabili
  liberamente. L'atterraggio dopo il login (`areaHome`,
  `ui/src/config/navigazione.js`, `admin > docente > studente`) si deriva dai
  due booleani. Guscio unico `ui/src/components/AppLayout.jsx` (menù a due
  livelli: aree + pagine); `RichiediAuth` prende una prop `area`. Nomi `is*`:
  eccezione ammessa all'italiano (vedi `DECISIONI_DESIGN.md`,
  "Internazionalizzazione"). Area Admin: **sola lettura** in questa fase.
- **Il campo `corretta` su una risposta non si scrive mai dal client.** Il
  client scrive solo la risposta grezza (`saveAnswer`, con `merge`); il calcolo
  e la scrittura di `corretta` sono di `functions/calcolaPunteggio.js` (trigger
  Firestore su `risposte/{id}`), e le security rules vietano `corretta` nel
  payload del client. Il calcolo client che resta in UI serve solo al display.
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
- **Un quesito si disattiva/riattiva, non si cancella** (campo `QUESITO.attivo`,
  metadato scritto in place — non crea una versione). Un quesito disattivato
  sparisce dalla banca ma resta risolvibile per id (quiz storici). **Filtro:
  `attivo !== false`** — un documento senza il campo (dati pre-esistenti) è
  attivo; MAI `attivo === true`. `getQuesito(id)` non filtra mai per `attivo`.
  Vedi `DECISIONI_DESIGN.md`, "Disattivazione dei quesiti".
- **`QUIZ.stato`: `bozza` → `attivo` ⇄ `chiuso` ⇄ `archiviato`.** `stato` è
  metadato mutabile e tutte le transizioni dopo `bozza` sono reversibili
  (`riapriQuiz`, `ripristinaQuiz`); solo `bozza` è modificabile e cancellabile
  (delete fisico). Dalla pubblicazione (`bozza → attivo`, generazione del QR) in
  poi il **contenuto è immutabile e permanente** — coerente con "nessuna riga
  storica si sovrascrive". `attivo` accetta risposte; `chiuso` no; `archiviato`
  esce dalle liste attive (i risultati restano). Lo studente apre solo quiz
  `attivo`. Per riusare un quiz si **duplica** in una nuova bozza, mai si
  modifica l'originale. Regola completa in `DECISIONI_DESIGN.md`, "Stati del quiz".

## Stato attuale del progetto

**Fase 1 (MVP somministrazione) e Fase 2 (login vero) completate. Fase 0
(deploy) chiusa: l'app è online** su `isaquiz.trikkulab.it` (progetto Firebase
su account privato dell'autore), in uso per il dogfooding coi colleghi docenti.
Prossimo: onboarding colleghi (lista `docentiAutorizzati`), poi Fase 3 (IA) e/o
la ricreazione del progetto Firebase nell'org dell'istituto prima della Fase 5.

Fase 0 — setup:

- [x] Struttura cartelle `/ui`, `/data`, `/functions`
- [x] ~~Mock auth~~ → sostituita in Fase 2 da `data/authProvider.js` (Auth reale)
- [x] Collezioni Firestore create con dati di prova — **in emulatore**:
      `npm run emu` (radice) avvia l'emulatore Firestore, `npm run seed` lo
      popola (`scripts/seed.mjs`: `config`, `utenti`, `classi`, `corsi`,
      `docenti_corso`, `quesiti`). Client puntato all'emulatore con
      `VITE_USE_FIRESTORE_EMULATOR=true` in `ui/.env`. `npm run seed` di default
      resta sull'emulatore (`demo-isaquiz`); `SEED_TARGET=prod` + key lo punta
      al DB reale (vedi `docs/deploy.md`).
- [x] Hosting UI su **GitHub Pages** (repo `trikkulab/isaquiz`), dominio custom
      **`isaquiz.trikkulab.it`** (`ui/public/CNAME`, `VITE_BASE=/`). Workflow
      `.github/workflows/deploy.yml` (Node 22): build `ui/` + deploy ad ogni push
      su `rel`. Routing **HashRouter** (niente `404.html`). Firebase Hosting NON
      si usa (nessun blocco `hosting` in `firebase.json`).
- [x] **Progetto Firebase reale** creato (account privato dell'autore),
      Firestore `europe-west8` (Milano, permanente). Regole e functions
      dispiegate. Deploy backend: `npm run deploy:rules` / `deploy:functions` /
      `deploy:backend` (dopo `firebase use <project-id>`). `scripts/seed.mjs`:
      `SEED_TARGET=prod` + key + `SEED_CONFIRM`; `SEED_SOLO_CONFIG=true`
      (+ `SEED_DOCENTI`) scrive solo `config` — modalità giusta per il pilota.
      Runbook e note operative in `docs/deploy.md`. **Da fare prima della Fase 5**:
      ricreare il progetto nell'org dell'istituto (memory
      `project_firebase_progetto_da_spostare`).

**Fase 1 (somministrazione quiz) — componenti e repository:**

- [x] `ui/src/pages/QuizStudente.jsx` — svolgimento quiz, un quesito alla
      volta, feedback immediato ✓/✗, nessun tasto indietro, avanzamento
      automatico configurabile (`config/impostazioniQuiz.js`) con riempimento
      progressivo e interruzione al tap (`components/BottoneAvanti.jsx`)
- [x] `ui/src/components/IdentitaStudente.jsx` — riga avatar+nickname+classe+
      livello, in due varianti di colore (`variante="scura"` su fondo
      gradiente, `"chiara"` su fondo pagina) pensate per convergere sulla
      stessa tonalità percepita pur partendo da fondi opposti (velo chiaro
      sopra lo scuro, velo di primario sopra il chiaro — stesso principio del
      badge livello). Riusata da `BarraQuiz` (variante scura) e da
      `StudenteHome`/`StatisticheStudente` (variante chiara), così l'identità
      resta coerente in tutta l'area studente, non solo durante il quiz. Vedi
      `DECISIONI_DESIGN.md`, "Identità studente".
- [x] `ui/src/components/BarraQuiz.jsx` — header con identità studente
      (`IdentitaStudente`, variante scura), quiz, barra di avanzamento a
      segmenti
- [x] `ui/src/components/QuesitoCard.jsx` — riusato in due modalità
      (`"quiz"` e `"correzione"`)
- [x] `ui/src/pages/QuizRisultati.jsx` — correzione completa ("contenuto
      puro"): riceve `quiz` + `risposte` come **prop** (niente più
      `useLocation` interno).
- [x] `ui/src/pages/QuizRisultatiPagina.jsx` — contenitore (route
      `/quiz/:quizId/risultati`, fuori dal guscio): usa lo `state` di
      navigazione se presente, altrimenti rilegge da Firestore
      (`getQuizConQuesiti` + `getRisposteStudente`) per link diretto / refresh.
      Incornicia `QuizRisultati` con `BarraQuiz` in stato `completato` (stessa
      intestazione del test: avatar/livello/materia — continuità visiva), un
      bottone "Torna alla home" (`/studente`) e `PiePagina`.
- [x] `ui/src/pages/RisultatiDocente.jsx` (route
      `/docente/quiz/:quizId/risultati`) — tabella studente × punteggio +
      "per quesito" (corrette/risposte), **in tempo reale**
      (`ascoltaRisposteQuiz` → `onSnapshot`). Punteggio calcolato lato client;
      nomi studenti in cache; guardia anti-race tra update ravvicinati.
- [x] `QuizStudente.jsx` cablato su Firestore (`getQuizConQuesiti(quizId)`),
      niente più `QUIZ_MOCK`. Stati loading / "non trovato" / "non ancora
      avviato" (`bozza`) / "chiuso" / "non più disponibile" (`archiviato`) /
      "senza quesiti" — mostrati con lo stesso stile di "Area riservata"
      (`RichiediAuth`): messaggio + link "Torna alla home" (`/studente`).
      `saveAnswer` scrive davvero su `risposte` (fire-and-forget).
      `BarraQuiz`/`QuizRisultati` mostrano `materia · docente` solo se presenti.
- [x] `ui/src/pages/StudenteHome.jsx` (route `/studente`) — pagina post-login
      dello studente: `IdentitaStudente` (variante chiara) in testa,
      "Partecipa a un quiz" → campo codice (`normalizzaCodice`
      live, **nessun controllo di lunghezza**: basta non vuoto) →
      `getQuizIdDaCodice` → `navigate('/quiz/:quizId')` o "Codice non valido";
      link alle statistiche; bottone "Esci".
- [x] `ui/src/pages/StatisticheStudente.jsx` (route `/studente/statistiche`) —
      `IdentitaStudente` (variante chiara) in testa, poi vista dello studente
      sui propri risultati **aggregati per argomento** (non
      per quiz), con punteggio **contestuale** ("3/4 su questo argomento").
      Filtro materia (`components/FiltroMaterie.jsx`: "Anno" = tutte, o una
      specifica; nascosto con ≤1 materia). **Layout adattivo**: sotto ~960px
      (`useBreakpoint`) `AccordionArgomenti` + `ModaleCorrezione` (overlay, con
      "Apri come pagina" → `/quiz/:id/risultati`); sopra, `PannelloArgomenti`
      master-detail con la correzione **inline**. La correzione è sempre
      `QuizRisultati` ("contenuto puro") montato da `components/CorrezioneQuiz.jsx`
      (fetch condiviso: `getQuizConQuesiti` + `getRisposteStudente`). Punteggio
      via `components/PunteggioContestuale.jsx`. La pagina fa **una** lettura
      aggregata e filtra per materia in memoria (tab e drill-down non rileggono).
      NON è la vista docente cross-quiz (resta Fase 4/5). Vedi
      `DECISIONI_DESIGN.md`, "Statistiche studente" e "Layout adattivo".
- [x] `data/quizRepository.js` (`getQuiz`; `getQuizConQuesiti` — quesiti in
      ordine + materia dal corso + docente dall'autore, "niente JOIN";
      `getQuizDocente` — meta + materia, ordinati per data; `creaQuiz` →
      `stato: "bozza"`; `aggiornaQuizBozza` / `eliminaQuiz` — consentite SOLO
      se `stato: bozza`; `duplicaQuiz` — da qualsiasi quiz crea una nuova
      bozza (id quesiti copiati, nessun legame con l'originale); `avviaQuiz`
      (`bozza → attivo` + genera il codice di accesso), `chiudiQuiz`
      (`attivo → chiuso`), `riapriQuiz` (`chiuso → attivo`) — a senso obbligato),
      `data/quesitiRepository.js`, `data/corsiRepository.js` (`getCorso`,
      `getCorsiDocente`, `getTuttiICorsi`, `getMaterieEsistenti`,
      `getClassiEsistenti`, `creaCorso`), `data/utentiRepository.js` (`getUtente`,
      `nomeVisibile`), `data/risposteRepository.js` (`saveAnswer` — id
      deterministico `quizId_studenteId_quesitoId`, mai `corretta`;
      `getRisposteQuiz(quizId)` tutte; `getRisposteStudente(quizId,
      studenteId)`; `ascoltaRisposteQuiz(quizId, onDati, onErrore)` — live
      via `onSnapshot`, ritorna l'unsubscribe;
      `getTutteLeRisposteStudente(studenteId)` — trasversale ai quiz, per le
      statistiche; `getStatistichePerArgomento(studenteId, materia?)` — aggrega
      per argomento del quesito, forma **annidata** (ogni argomento porta i suoi
      quiz col punteggio contestuale), `materia` opzionale filtra;
      `getQuizPerArgomento(studenteId, argomento)` — comodità, riusa la forma
      annidata), nuovo `data/codiciAccessoRepository.js` (collezione
      `codici_accesso`, id = codice: `getQuizIdDaCodice`, `getCodiceQuiz`,
      `generaCodiceQuiz` idempotente, `normalizzaCodice` pura (clemenza
      Crockford + **allowlist** all'alfabeto → output sempre id-doc valido);
      Crockford Base32; `generaCodiceQuiz` invoca la Cloud Function
      `generaCodiceAccesso` (transazione, verifica autore) — niente più race —
      vedi `DECISIONI_DESIGN.md`, "Codice di accesso ai quiz").
      Versionamento quesiti (id `baseId-vN`, campo `versione`): `getBancaDocente`
      (ex `getQuesitiDocente`) raggruppa per `baseId`, ritorna solo l'ultima
      versione, e filtra `attivo !== false` salvo `{ includiInattivi: true }`;
      `getQuesito(id)` risolve qualsiasi versione esatta senza filtri;
      `creaQuesito` (baseId nuovo, v0), `salvaNuovaVersione` (stesso baseId,
      +1), `forkQuesito` (baseId nuovo, autore corrente) — tutte `attivo: true`;
      `impostaAttivoQuesito(id, attivo)` (in place); `idProssimaVersione`
      (pura). Tutte scrivono `fonte: "manuale"`. `archiviaQuiz` /
      `ripristinaQuiz` (`chiuso ⇄ archiviato`, reversibile; non toccano il
      codice). Restano stub: `getStatistichePerArgomento` /
      `getQuizPerArgomento`: **implementati** (vedi sopra). Seed:
      `quiz-prova-rinascimento` (attivo, Storia, `TEST01`),
      `quiz-bozza-informatica` (bozza), `quiz-chiuso-informatica`
      (chiuso, `TEST02`), `quiz-attivo-informatica` (attivo, `TEST03`),
      `quiz-info-3`/`quiz-info-4` (chiusi, `TEST04`/`TEST05`), `quiz-info-5`
      (attivo, `TEST06`) — questi ultimi tre con `avviato` esplicito (non
      `serverTimestamp`) e solo per la demo di "Andamento studente": 3
      studenti (`mock-studente-3`/Marco aggiunto apposta), 37 risposte, di
      cui le 5 informatiche in sequenza per studente fanno scattare i tre
      segnali di `calcolaTrendMateria` (Giulia → calo, Luca → miglioramento,
      Marco → debolezza persistente — vedi `DECISIONI_DESIGN.md`, "Andamento
      studente"); 7 quesiti di cui 1 inattivo (`seed-info-3`), gli altri
      senza il campo `attivo`.
- [x] `functions/calcolaPunteggio.js` — Cloud Function reale (Fase 2): trigger
      `onDocumentWritten` su `risposte/{id}`, scrive `corretta` server-side
      (guardia anti-loop, ricalcolo al cambio risposta). Il calcolo client resta
      solo per il display immediato.
- [x] `CreaQuiz.jsx` — comporre un quiz: selettore corso, banca quesiti con
      ricerca (testo/opzioni), filtro (materia, argomento), ordinamento
      (recenti / testo / argomento, verso invertibile via `BottoneVerso`),
      toggle "Mostra inattivi" (default off) con azione Disattiva/Riattiva per
      card, e contenitore ridimensionabile, form
      quesito, aggiungi/rimuovi dal quiz. Nel form la `materia` è una `<select>`
      pre-selezionata sul corso corrente ma modificabile (opzioni: unione delle
      materie dei corsi del docente + di quelle già in banca, incluse annate
      passate — nessuna lettura extra). Click sulla card di un quesito → lo
      carica nel form (contenuto editabile, versione/autore in sola lettura);
      i bottoni diventano "Salva nuova versione" + "Duplica come
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
      (`getQuizDocente`) con badge di stato, ricerca (titolo), filtri (stato,
      materia), ordinamento (recenti / titolo / stato, verso invertibile via
      `BottoneVerso`), "Crea nuovo quiz", e per riga:
      bozza → "Pubblica e avvia" / "Modifica" (→ `crea-quiz/:id`) / "Elimina"
      (conferme inline); attivo → "Risultati" / "Link e QR" (`AccessoQuiz`) /
      "Chiudi"; chiuso → "Risultati" / "Link e QR" / "Riapri" / "Archivia";
      archiviato → "Ripristina" / "Risultati"; non-bozza → "Duplica". Gli
      archiviati sono nascosti salvo spunta "Mostra archiviati" (come "Mostra
      inattivi" per i quesiti in `CreaQuiz`).
- [x] `ui/src/pages/GestioneCorsi.jsx` (route `/docente/corsi`) — elenco dei
      propri corsi + form "Nuovo corso" (materia/classe via
      `components/CampoCombobox.jsx` — `<input list>`+`<datalist>` nativi,
      suggerimenti globali da `corsiRepository.getMaterieEsistenti` /
      `getClassiEsistenti`, testo libero). `corsiRepository.creaCorso`
      (`writeBatch` atomico: `corsi/{id}` + `docenti_corso/{uid_corsoId}`
      titolare; `annoScolastico` da `CONFIG`; `codiceAccesso` generato). Solo
      creazione: modifica/disattivazione corso restano all'admin.
- [x] Navigazione condivisa: `components/AppLayout.jsx` (guscio unico, menù a
      due livelli aree+pagine, drawer sotto 640px; route di layout — 3 gruppi
      per area con guardia diversa), `config/navigazione.js` (`AREE`,
      `areaHome`), `pages/Indirizza.jsx` (route `/`), `pages/NonTrovato.jsx`
      (route `*`), `components/PiePagina.jsx`. Vedi `DECISIONI_DESIGN.md`,
      "Navigazione e layout".
- [x] Area Admin (sola lettura): `pages/admin/AdminCorsi.jsx`
      (`corsiRepository.getTuttiICorsi`), `AdminDocenti.jsx`
      (`getDocentiAutorizzati`), `AdminImpostazioni.jsx` (`getConfig`). Route
      `/admin/corsi|docenti|impostazioni`. Scritture admin (editare la lista
      docenti da UI) → rimandate (serve regola su `config` legata a `isAdmin`).
- [x] `ui/src/pages/AndamentoCorso.jsx` (route
      `/docente/corsi/:corsoId/andamento`, link "Andamento" per riga in
      `GestioneCorsi.jsx`) — andamento degli studenti di UN corso (mai per
      materia in astratto, mai cross-corso). Layout adattivo come
      "Statistiche studente" (`AccordionAndamento.jsx` /
      `PannelloAndamento.jsx`), stesso `ModaleCorrezione`/`CorrezioneQuiz` per
      la correzione. `risposteRepository.getAndamentoCorso(corsoId,
      docenteId)` — una lettura aggregata per corso, per studente: serie
      cronologica dei punteggi quiz (trend a livello materia,
      `calcolaTrendMateria` — regressione lineare su indice quiz, soglie
      **non tarate su dati reali**, vedi `DECISIONI_DESIGN.md`, "Andamento
      studente") e rottura per argomento (frazione grezza, niente trend).
      `quizRepository.getQuizCorso(corsoId, docenteId)` filtra anche per
      `autoreId` (indispensabile per le security rules su una query `list`,
      vedi nota lì).
- [ ] Ancora da fare lato docente: chiusura automatica a tempo (`chiudeAlle`);
      modifica/disattivazione di un corso (oggi solo creazione).
- [x] **Codice di accesso senza race (Fase 2)**: `functions/generaCodiceAccesso.js`
      (callable, transazione + verifica autore); `data/codiciAccessoRepository.js`
      `generaCodiceQuiz` la invoca. Il client non scrive più su `codici_accesso`.

**Fase 2 (login vero) — fatta.** Firebase Auth + Google, dominio istituzionale,
provisioning `utenti/{uid}` + ruolo da lista a ogni login, `data/mockAuth.js`
rimossa, security rules reali, `calcolaPunteggio` server-side, codice di accesso
via Cloud Function. `data/authProvider.js` + `ui/src/auth/`. Emulatori: `npm run
emu` avvia anche Auth e Functions; `npm run seed` crea gli account Auth di prova.

Prossimo, da affrontare in sessioni separate:
- ~~**Coda Fase 0 — primo deploy reale**~~ — **fatto**: app online su
  `isaquiz.trikkulab.it`, regole + functions dispiegate, in uso per il
  dogfooding. Runbook e operazioni ricorrenti in `docs/deploy.md`.
- ~~**Onboarding docente / creazione corsi**~~ — **fatto** (2026-09):
  creazione corso **self-service** (`GestioneCorsi.jsx`, route `/docente/corsi`,
  `corsiRepository.creaCorso` → `writeBatch` corso + `docenti_corso` titolare;
  rules `create`-only). L'autorizzazione del docente (email in
  `config/current.docentiAutorizzati`) resta **console/seed**, non c'è pagina
  admin — procedura in `docs/deploy.md`. Vedi `DECISIONI_DESIGN.md`,
  "Onboarding docente e creazione corsi".
- **Rafforzare le security rules** — vedi memory `project_rules_firestore_da_rafforzare`.

## Cosa NON fare in questa fase

Non anticipare Fase 3 (IA), Fase 4 (banca dati condivisa e badge/livelli): sono
volutamente rimandate, vedi "Cosa resta fuori dal primo rilascio" nel piano di
sviluppo. Il campo `UTENTE.livello` esiste ma è solo un default (1) di display
finché non c'è la gamification.

