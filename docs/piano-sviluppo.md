# isaquiz — Piano di sviluppo (roadmap tecnica)

## Principio guida

Sviluppo a partire dal flusso centrale — somministrazione del quiz — con autenticazione fittizia ("mock auth", `data/mockAuth.js`). Login reale con Google collegato solo dopo, a sistema stabile. Nessuno studente deve usare la piattaforma prima che il login vero sia attivo.

## Le fasi

| Fase | Obiettivo | Output atteso | Stima |
|---|---|---|---|
| 0 | Setup iniziale | Repository /ui /data /functions; schema Firestore vuoto; mock auth | 1 sera |
| 1 | Somministrazione quiz (MVP) | Docente crea/avvia quiz, studenti rispondono via QR, risultati in tempo reale | 3-4 giorni |
| 2 | Login vero | Firebase Auth Google, dominio istituzionale, mock rimosso | 1 giorno |
| 3 | Generazione domande IA | Cloud Function proxy, upload testo/appunti, revisione docente | 3-5 giorni |
| 4 | Banca dati condivisa e gamification | Condivisione domande tra docenti, sistema badge | 1-2 settimane |
| 5 | Sperimentazione pilota | Rilascio con login reale, raccolta feedback | da pianificare |

## Dettaglio per fase

### Fase 0 — Setup iniziale
- Repository con cartelle /ui, /data, /functions
- Collezioni Firestore definite (quiz, domande, risposte, classi, badge), senza popolarle
- Modulo mock auth (costante docente/studente)
- Hosting statico del frontend (GitHub Pages o Cloudflare Pages)

### Fase 1 — Somministrazione quiz (MVP)
- Interfaccia docente: creare domande manualmente
- Interfaccia docente: comporre un quiz da un elenco di domande
- Generazione QR code/link per accesso studenti
- Interfaccia studente: aprire il quiz e rispondere
- Cloud Function: calcolo del punteggio lato server
- Interfaccia docente: risultati in tempo reale
- Repository /data: getQuiz, saveAnswer, getResults

### Fase 2 — Login vero
- Firebase Auth con provider Google
- Restrizione al dominio istituzionale (parametro hd)
- Sostituzione del mock auth con l'utente autenticato reale
- Security rules di Firestore (docente vede solo la propria classe, ecc.)

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
