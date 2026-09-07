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

Si parte dal flusso centrale — somministrazione del quiz — con un'autenticazione fittizia
("mock auth", vedi `data/mockAuth.js`). Il login reale con Google (Firebase Auth) viene
collegato solo quando il resto è stabile. Nessuno studente deve usare la piattaforma
prima che il login vero sia in funzione: il mock è solo per lo sviluppo interno.

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

Copiare `.env.example` in `ui/.env` (mai versionato). Per lo sviluppo locale
bastano `VITE_FIREBASE_PROJECT_ID=demo-isaquiz` e `VITE_USE_FIRESTORE_EMULATOR=true`.

Sviluppo con l'emulatore Firestore (tre terminali):

```bash
npm run emu     # radice: avvia l'emulatore Firestore (+ Emulator UI su :4000)
npm run seed    # radice: popola l'emulatore con dati di prova
cd ui && npm run dev
```

`functions/` ha un proprio `package.json` (`cd functions && npm install`) —
serve solo quando si lavora sulle Cloud Functions.

## Deploy

Hosting su **GitHub Pages** (repo `trikkulab/isaquiz`): il workflow
`.github/workflows/deploy.yml` builda `ui/` e pubblica ad ogni push su `rel`.
App servita sotto `/isaquiz/` (project page), routing con HashRouter.
Setup e passaggio al dominio custom: `docs/deploy.md`.

## Stato del progetto

Vedi il Piano di sviluppo per le fasi (0-5) e la checklist dei task.
