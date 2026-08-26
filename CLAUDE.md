# CLAUDE.md

Istruzioni persistenti per Claude Code su questo progetto. Letto automaticamente
a inizio sessione — tienilo aggiornato quando una decisione presa in una sessione
deve valere anche per le altre. Per il contesto esteso: `README.md` (struttura
cartelle) e `DECISIONI_DESIGN.md` (perché le cose sono fatte così).

## Cos'è isaquiz

Piattaforma web per quiz in classe: il docente crea/genera domande, somministra
un quiz via QR code, gli studenti rispondono da telefono, si vedono risultati e
progressi nel tempo. Principio guida: "pochi passaggi dal contenuto della
lezione al quiz" — la semplicità d'uso è un requisito, non un nice-to-have.

## Stack

React + Vite (SPA, routing con react-router-dom) — Firebase/Firestore (regione
europe-west) — Cloud Functions solo per ciò che richiede un segreto o fiducia
(proxy IA, calcolo punteggio) — nessun framework CSS scelto ancora.

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

Prossimo passo dopo la Fase 0: **Fase 1**, somministrazione quiz — partendo da
`ui/src/pages/QuizStudente.jsx` e `ui/src/components/BarraQuiz.jsx`, con mock
auth, senza toccare ancora login reale, IA o gamification.

## Cosa NON fare in questa fase

Non anticipare Fase 2 (login vero), Fase 3 (IA), Fase 4 (banca dati condivisa e
badge) mentre si lavora sull'MVP di somministrazione — sono volutamente
rimandate, vedi "Cosa resta fuori dal primo rilascio" nel piano di sviluppo.
