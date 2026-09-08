# isaquiz — Piano di sviluppo (roadmap tecnica)

## Principio guida

Sviluppo a partire dal flusso centrale — somministrazione del quiz — con autenticazione fittizia ("mock auth", `data/mockAuth.js`). Login reale con Google collegato solo dopo, a sistema stabile. Nessuno studente deve usare la piattaforma prima che il login vero sia attivo.

## Le fasi

| Fase | Obiettivo | Output atteso | Stima |
|---|---|---|---|
| 0 | Setup iniziale | Repository /ui /data /functions; schema Firestore vuoto; mock auth | 1 sera |
| 1 ✅ | Somministrazione quiz (MVP) | Docente crea/avvia quiz, studenti rispondono via QR, risultati in tempo reale | 3-4 giorni |
| 2 ✅ | Login vero | Firebase Auth Google, dominio istituzionale, mock rimosso, rules reali | 1 giorno |
| 3 | Generazione domande IA | Cloud Function proxy, upload testo/appunti, revisione docente | 3-5 giorni |
| 4 | Banca dati condivisa e gamification | Condivisione domande tra docenti, sistema badge | 1-2 settimane |
| 5 | Sperimentazione pilota | Rilascio con login reale, raccolta feedback | da pianificare |

## Dettaglio per fase

### Fase 0 — Setup iniziale
- Repository con cartelle /ui, /data, /functions (+ /scripts e package.json radice per il tooling)
- Schema Firestore definito (`quesiti`, `quiz`, `risposte`, `corsi`, `classi`,
  `utenti`, `config`, `docenti_corso`, `badge`) — vedi `isaquiz_ERD.md`
- Emulatore Firestore + dati di prova idempotenti (`scripts/seed.mjs`,
  `npm run emu` / `npm run seed`), niente progetto Firebase reale
- Modulo mock auth (costante docente/studente)
- Hosting statico del frontend (GitHub Pages o Cloudflare Pages) — ancora da fare

### Fase 1 — Somministrazione quiz (MVP)
- Interfaccia docente: creare quesiti manualmente — fatto (`CreaQuiz.jsx`),
  con versionamento (`baseId`/`versione`) e fork
- Interfaccia docente: comporre un quiz da un elenco di quesiti e salvarlo
  come bozza — fatto
- Pubblicazione quiz (`stato: bozza → attivo`) + accesso studenti — fatto in
  `CreaQuiz` (`avviaQuiz`): codice breve digitabile (Crockford Base32,
  collezione `codici_accesso`), QR e link (`qrcode.react`)
- Interfaccia studente: home `/studente` (`StudenteHome`) con "Partecipa a un
  quiz" (codice); aprire il quiz e rispondere — fatto, su Firestore
  (`getQuizConQuesiti`), solo quiz `attivo`; le risposte sono persistite
  (`saveAnswer` → collezione `risposte`)
- Interfaccia docente: home con elenco dei propri quiz (`DocenteHome`,
  route `/docente`) — fatto: crea / modifica bozza / pubblica / chiudi ⇄
  riapri / elimina bozza / duplica / link-QR / risultati; ricerca, filtri
  (stato, materia) e ordinamento sulla lista
- Cloud Function: calcolo del punteggio lato server — stub, calcolo ancora client
- Interfaccia docente: risultati del quiz in tempo reale (`RisultatiDocente`,
  `ascoltaRisposteQuiz` → `onSnapshot`) — fatto: tabella studente × punteggio
  + per-quesito, aggiornata mentre la classe risponde
- Repository /data: `quizRepository` (getQuiz, getQuizConQuesiti, getQuizDocente,
  creaQuiz, aggiornaQuizBozza, avviaQuiz, chiudiQuiz, riapriQuiz, eliminaQuiz,
  duplicaQuiz), `codiciAccessoRepository` (getQuizIdDaCodice, getCodiceQuiz,
  generaCodiceQuiz, normalizzaCodice), `quesitiRepository` (getBancaDocente,
  getQuesito, creaQuesito, salvaNuovaVersione, forkQuesito,
  impostaAttivoQuesito), `corsiRepository`
  (getCorso, getCorsiDocente), `utentiRepository` (getUtente),
  `risposteRepository` (saveAnswer, getRisposteQuiz, getRisposteStudente,
  ascoltaRisposteQuiz; getStatistichePer* → Fase 4/5)

### Fase 2 — Login vero — FATTA

- [x] Firebase Auth con provider Google (`data/authProvider.js`, `ui/src/auth/`)
- [x] Restrizione al dominio istituzionale (hint `hd` + controllo in
      authProvider + `isDominio()` nelle rules)
- [x] Mock auth rimossa; provisioning `utenti/{uid}` + ruolo docente da
      `config/current.docentiAutorizzati`, ricontrollato a ogni login
- [x] Security rules di Firestore reali — **minime ma reali** (legate a
      `request.auth`; da rafforzare: vedi `DECISIONI_DESIGN.md`, "Security rules")
- [x] `functions/calcolaPunteggio.js` reale (trigger, `corretta` server-side)
- [x] Codice di accesso senza race (`functions/generaCodiceAccesso.js`, callable)
- Restano: passi manuali di deploy (`docs/deploy.md`, "Fase 2 — abilitare il
  login"); onboarding docente / creazione corsi (non c'è ancora UI); vista
  "docente vede solo la propria classe" più stretta (oggi lettura larga).

### Fase 3 — Generazione domande IA
- Cloud Function proxy verso il provider IA (chiave mai esposta al client)
- Interfaccia docente: caricamento testo/appunti
- Interfaccia docente: revisione e validazione delle domande generate
- Avviso in interfaccia su cosa non caricare (dati studenti, materiali coperti da copyright)

### Fase 4 — Banca dati condivisa e gamification
- Flag "condivisa" sulle domande e relativa security rule di lettura
- Interfaccia: sfoglia/riusa domande di altri docenti
- Sistema badge (costanza, miglioramento, partecipazione)
- Interfaccia studente: visualizzazione badge e progressi

### Fase 5 — Sperimentazione pilota con i ragazzi
- Completare i documenti di sperimentazione (vedi `documenti-sperimentazione.md`)
- Far validare i documenti dal RPD dell'istituto
- Selezionare docenti e classi pilota
- Rilascio con login reale, nessun dato mock residuo
- Raccolta feedback

## Cosa resta fuori dal primo rilascio

- randomizzazione dell'ordine di domande/risposte;
- domande differenti per studente;
- statistiche avanzate su periodo scolastico esteso;
- condivisione della banca dati tra più istituti.
