# isaquiz

Piattaforma semplice per la verifica immediata dell'apprendimento — quiz in classe via QR code, generazione domande assistita da IA, statistiche di progresso per studente e per classe.

Vedi il Project Charter e il Piano di sviluppo (documenti separati) per la visione completa e la roadmap a fasi.

## Struttura del progetto

```
isaquiz/
├── ui/            Frontend (SPA). Non sa nulla di Firestore: parla solo con /data.
├── data/          Unico punto di accesso al database. Se cambia il DB, cambia solo qui.
└── functions/     Cloud Functions — solo per ciò che richiede un segreto o fiducia
                   (proxy verso il provider IA, calcolo del punteggio lato server).
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
cd ui && npm install && npm run dev
```

Le variabili d'ambiente vanno copiate da `.env.example` a `.env` (mai versionato).

## Stato del progetto

Vedi il Piano di sviluppo per le fasi (0-5) e la checklist dei task.
