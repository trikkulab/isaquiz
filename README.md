# isaquiz

Piattaforma semplice per la verifica immediata dell'apprendimento — quiz in classe via QR code, generazione domande assistita da IA, statistiche di progresso per studente e per classe.

Vedi il Project Charter e il Piano di sviluppo (documenti separati) per la visione completa e la roadmap a fasi.

## Struttura del progetto

```
isaquiz/
├── ui/            Frontend (SPA). Non sa nulla di Firestore: parla solo con /data.
├── data/          Unico punto di accesso al database (SDK Firebase qui, non in ui/).
│                  Se cambia il DB, cambia solo qui. Ha un proprio package.json.
├── functions/     Cloud Functions — solo per ciò che richiede un segreto o fiducia
│                  (proxy verso il provider IA, calcolo del punteggio lato server).
├── scripts/       seed.mjs — popola l'emulatore Firestore con dati di prova.
└── package.json   Tooling di sviluppo (emulatore, seed): npm run emu / npm run seed.
```

## Principio guida per lo sviluppo

Si è partiti dal flusso centrale — somministrazione del quiz — con un'autenticazione
fittizia. Dalla Fase 2 il login è **reale**: Firebase Auth con Google, ristretto al
dominio istituzionale, provisioning di `utenti/{uid}` e ruolo docente da
`config/current.docentiAutorizzati` (ricontrollato a ogni login). Il layer è in
`data/authProvider.js` (nessun componente `ui/` parla con Firebase Auth
direttamente); in UI l'utente arriva da `ui/src/auth/AuthContext.jsx` e le route
sono protette da `RichiediAuth`.

## Layout responsive/adattivo

L'interfaccia deve funzionare su desktop, tablet e smartphone, con mouse o touch.
Alcune schermate (es. le statistiche) si riorganizzano — non solo si ridimensionano —
sopra una certa larghezza: vedi `ui/src/hooks/useBreakpoint.js` e i componenti
`AccordionArgomenti` (mobile) / `PannelloArgomenti` (desktop) come esempio del pattern:
stesso contenuto (`QuizRisultati`), contenitore diverso a seconda dello spazio disponibile.

## Setup iniziale

```bash
npm install            # radice: tooling (emulatore Firestore, seed)
cd data && npm install # SDK Firebase (consumato da ui/)
cd ../ui && npm install
```

Serve anche `cd functions && npm install` (le Cloud Function girano nell'emulatore).

Creare `ui/.env` (mai versionato). Per lo sviluppo locale bastano
`VITE_FIREBASE_PROJECT_ID=demo-isaquiz` e `VITE_USE_FIRESTORE_EMULATOR=true`
(la stessa flag collega Firestore, Auth e Functions agli emulatori).

Sviluppo con gli emulatori (tre terminali):

```bash
npm run emu     # radice: Firestore + Auth + Functions (+ Emulator UI su :4000)
npm run seed    # radice: popola i dati di prova E gli utenti Auth dell'emulatore
cd ui && npm run dev
```

`npm run seed` crea nell'emulatore gli account Auth `rossi@isarome.it`
(docente), `admin@isarome.it` (solo admin — vede l'area Admin, non Docente),
`giulia.bianchi@isarome.it` e `luca.verdi@isarome.it` (studenti) — `isarome.it`
è il dominio istituzionale (costante in `firestore.rules`, override locale con
`SEED_DOMINIO`). Nella pagina `/accedi` si "accede" con uno di questi tramite il
selettore dell'emulatore Auth. Per intestare i dati demo a un altro account:
`SEED_DOCENTE_EMAIL=tua@isarome.it npm run seed`.

## Deploy

Hosting su **GitHub Pages** (repo `trikkulab/isaquiz`), dominio custom
**`isaquiz.trikkulab.it`**: il workflow `.github/workflows/deploy.yml` builda
`ui/` e pubblica ad ogni push su `rel`. Routing con HashRouter. Setup: `docs/deploy.md`.

## Stato del progetto

Vedi il Piano di sviluppo per le fasi (0-5) e la checklist dei task.
