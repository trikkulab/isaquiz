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

## Styling

**Tailwind CSS**, classi di utilità direttamente nei componenti — niente file
`.css` separati da tenere sincronizzati a mano. Non ancora shadcn/ui: se ne
riparla quando si arriva alla pagina statistiche (accordion, modale, tabs), per
ora si lavora con Tailwind puro.

- **Schermate studente (`QuizStudente`, `BarraQuiz`, `DomandaCard`)**: qui c'è
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

## Regole architetturali fisse — non violarle senza discuterne esplicitamente

- **Nessun componente in `ui/` accede a Firestore direttamente.** Sempre tramite
  i moduli in `data/` (`quizRepository.js`, `domandeRepository.js`,
  `risposteRepository.js`). Se un componente ha bisogno di un nuovo modo di
  leggere/scrivere dati, si aggiunge una funzione al repository giusto, non una
  chiamata Firestore inline.
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
- **Niente JOIN mentali col vecchio schema relazionale.** `quiz.domande` è un
  array di ID dentro il documento quiz. `risposte` è una collezione top-level
  (non sotto-collezione di quiz) con `quizId`/`studenteId`/`domandaId` come
  campi, proprio per poter interrogare "tutte le risposte di uno studente nel
  tempo" trasversalmente ai quiz. Query composte su più entità = letture
  separate assemblate nel codice del repository, non una query sola.
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
  client. Ogni domanda generata resta in stato di bozza finché il docente non
  la valida esplicitamente ("human in the loop": mai pubblicare domande IA
  senza revisione).

## Stato attuale del progetto

Siamo alla **coda della Fase 0** (setup iniziale) del piano di sviluppo:

- [x] Struttura cartelle `/ui`, `/data`, `/functions`
- [x] Mock auth (stub funzionante in `data/mockAuth.js`)
- [ ] Collezioni Firestore create con dati di prova (lo schema è disegnato, non
      ancora popolato nemmeno in emulatore)
- [ ] Hosting statico configurato (GitHub Pages o Cloudflare Pages)

**Fase 1 (somministrazione quiz), lato studente in buono stato:**

- [x] `ui/src/pages/QuizStudente.jsx` — svolgimento quiz, una domanda alla
      volta, feedback immediato ✓/✗, nessun tasto indietro
- [x] `ui/src/components/BarraQuiz.jsx` — header con identità studente, quiz,
      livello (solo display), barra di avanzamento a segmenti
- [x] `ui/src/components/DomandaCard.jsx` — riusato in due modalità
      (`"quiz"` e `"correzione"`)
- [x] `ui/src/pages/QuizRisultati.jsx` — correzione completa con punteggio
      totale, spiegazione e tag argomento per domanda
- [ ] Tutto quanto sopra gira ancora su un quiz mock hardcoded in
      `QuizStudente.jsx` (`QUIZ_MOCK`), non su Firestore — `quizRepository.js` /
      `domandeRepository.js` / `risposteRepository.js` restano stub
- [ ] `functions/calcolaPunteggio.js` resta uno stub: il calcolo di
      giusto/sbagliato è ancora lato client, rischio noto e accettato per ora
      (vedi `DECISIONI_DESIGN.md`, "Flusso quiz studente")
- [ ] Interfaccia docente non iniziata: `DocenteHome.jsx`, `CreaQuiz.jsx`

Prossimo passo naturale: lato docente (per uscire dai dati mock), oppure
chiudere la coda della Fase 0 (Firestore popolato, hosting) — non ancora
deciso quale per primo.

## Cosa NON fare in questa fase

Non anticipare Fase 2 (login vero), Fase 3 (IA), Fase 4 (banca dati condivisa e
badge) mentre si lavora sull'MVP di somministrazione — sono volutamente
rimandate, vedi "Cosa resta fuori dal primo rilascio" nel piano di sviluppo.

