# Deploy — GitHub Pages

Stato: **coda Fase 0**, con Fase 2 (login vero) già nel codice. Le sezioni 1–9
sotto sono il setup base del progetto Firebase + Pages; la sezione **"Fase 2 —
abilitare il login"** più in fondo va fatta prima di qualsiasi accesso reale.
Fino ad allora, dogfooding solo con gli account che si creano a mano.

## Come funziona

- Workflow: `.github/workflows/deploy.yml`. Builda `ui/` e pubblica su GitHub
  Pages **ad ogni push su `rel`** (o a mano dalla tab Actions → Run workflow).
- Dominio: **`https://isaquiz.trikkulab.it/`** (custom domain su GitHub Pages,
  `ui/public/CNAME`). Il workflow passa `VITE_BASE=/` (radice del dominio). Il
  vecchio URL `trikkulab.github.io/isaquiz/` viene rediretto qui da GitHub.
- Routing: **HashRouter** (`ui/src/main.jsx`). Gli URL hanno il `#`
  (`isaquiz.trikkulab.it/#/quiz/abc`). Scelta voluta: nessun `404.html` da tenere
  sincronizzato, refresh e link diretti funzionano sempre su hosting statico.

## Setup una tantum — creare il progetto Firebase reale

Tutto da **console web** (la Firebase CLI non è autenticata su questa macchina e
non serve autenticarla ora). Regione Firestore scelta: **`europe-west8` (Milano)**
— dati in Italia, coerente con `docs/analisi-gdpr.md`. **La regione è permanente.**

### 1. Progetto Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → **Aggiungi progetto**.
2. Nome: `isaquiz` (il *Project ID* globale sarà `isaquiz` se libero, altrimenti
   `isaquiz-xxxxx` — **annotalo**, serve dopo).
3. **Google Analytics: disattiva.** Non serve e aggiunge un data-processor in più
   da gestire nella parte GDPR.

### 2. Database Firestore

1. **Build → Firestore Database → Crea database**.
2. **Edition: Standard.** (Enterprise = compatibilità MongoDB, costo più alto e
   niente free tier — non serve. La scelta è permanente.) Data access mode:
   **Firestore Native** (default con Standard).
3. **Location: `europe-west8` (Milan)**. ⚠️ Non si cambia più.
4. **Modalità produzione** (regole chiuse di default; le sostituiamo al passo 3
   della sezione — poco importa comunque, incolliamo subito le nostre).
5. Attiva.

### 3. Regole

`firestore.rules` nel repo è la fonte di verità (regole reali, Fase 2). Puoi
incollarle a mano una prima volta (Console Firestore → **Regole** → Pubblica),
ma dalla Fase 2 conviene il deploy via CLI: vedi "Fase 2 — abilitare il login".

> **Allinea la costante del dominio**: in `firestore.rules`, la funzione
> `dominioIstituzionale()` ritorna `'istituto.example'`. Sostituiscilo col
> dominio Google Workspace reale **prima** di pubblicare, e tienilo uguale a
> `config/istituto.dominioIstituzionale`.

### 4. Web app + config

1. In alto a sinistra, ingranaggio ⚙️ accanto a "Panoramica progetto" →
   **Impostazioni progetto**. Tab **Generali**, scorri fino a **"Le tue app"**.
2. Clicca l'icona **`</>`** (Web). Nickname `isaquiz-ui`. **Non** spuntare
   "Configura anche Firebase Hosting" (siamo su GitHub Pages). → **Registra app**.
3. La schermata "Aggiungi l'SDK di Firebase" mostra l'oggetto `firebaseConfig`:
   copia i 6 valori (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`). → "Continua alla console".
   Se hai già chiuso: Impostazioni progetto → Le tue app → `isaquiz-ui` →
   "SDK setup and configuration" → opzione **Config**.

### 5. Secret su GitHub (repo `trikkulab/isaquiz`)

**Settings → Secrets and variables → Actions → New repository secret**, sei volte:

| Secret | Valore da `firebaseConfig` |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` (`<project-id>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

Sono chiavi **pubbliche** (client-side): stanno nei secret per igiene e per poter
cambiare progetto senza toccare il codice, non perché siano segrete.

### 6. Abilita Pages

**Settings → Pages → Source: `GitHub Actions`**.

### 7. Seed del DB reale

1. **Impostazioni progetto → Account di servizio → Genera nuova chiave privata** →
   salva il `.json` nella root del repo (è già in `.gitignore`) o altrove.
2. Dalla root del repo:
   ```sh
   SEED_TARGET=prod \
   SEED_PROJECT_ID=<project-id> \
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
   SEED_CONFIRM=<project-id> \
   npm run seed
   ```
   Popola `config`, `utenti`, `classi`, `corsi`, `docenti_corso`, `quesiti`, i 3
   quiz di prova + codici `TEST01`/`TEST02` (stessi dati dell'emulatore).
3. **Revoca la chiave** dalla console quando hai finito (o tienila al sicuro per i
   re-seed). Il seed è idempotente: puoi rilanciarlo.

> I dati di `config` sono di esempio (`IIS Esempio`, dominio `istituto.example`,
> docente `rossi@istituto.example`). Col login reale vanno messi valori veri:
> vedi "Fase 2 — abilitare il login", punto B. Per intestare i quiz/quesiti demo
> al tuo account: `SEED_DOCENTE_EMAIL=<tua email> …` (dopo che hai fatto login
> almeno una volta, così l'account esiste).

### 8. Primo deploy

Merge `dev` → `rel` (o push su `rel`). La tab **Actions** builda e pubblica su
`https://isaquiz.trikkulab.it/`.

### 9. Verifica end-to-end

1. Apri `https://isaquiz.trikkulab.it/#/studente`.
2. Inserisci il codice `TEST01` → deve caricare "Verifica: il Rinascimento".
3. `#/docente` → deve elencare i 3 quiz di prova con i badge di stato.

Se le schermate dati vanno in errore: secret mancanti/errati (passo 5) o regole
non pubblicate (passo 3).

## Dominio custom — `isaquiz.trikkulab.it`

Configurato. Sottodominio → project page di `trikkulab/isaquiz`.

**Ordine di esecuzione** (evita che il sito si rompa a metà):

1. **DNS** (pannello di `trikkulab.it`): record `CNAME`, host `isaquiz`, valore
   `trikkulab.github.io.` (il dominio del profilo, **non** `.../isaquiz`).
2. **GitHub → Settings → Pages → Custom domain**: `isaquiz.trikkulab.it` → Save.
   Attendi il check DNS verde (minuti → ~1h), poi spunta **Enforce HTTPS**
   (il certificato può richiedere fino a 24h, di solito molto meno).
3. Solo a check verde: merge `dev` → `rel`. Il build ora esce con `VITE_BASE=/`
   e `ui/public/CNAME` → assets serviti dalla radice del dominio.

> Se inverti l'ordine (deploy con `VITE_BASE=/` prima che il dominio risponda),
> `trikkulab.github.io/isaquiz/` si rompe: cerca gli asset in `/assets` invece di
> `/isaquiz/assets`. Con il custom domain attivo GitHub redirige comunque il
> vecchio URL qui.

**Fase 2**: aggiungi `isaquiz.trikkulab.it` ai *domini autorizzati* di Firebase
Auth, altrimenti il login Google lo rifiuta.

Nessuna modifica al codice applicativo: i link/QR si costruiscono da
`import.meta.env.BASE_URL` (vedi `ui/src/components/AccessoQuiz.jsx`).

Opzionale, più avanti: se il `#` negli URL dà fastidio si può tornare a
`BrowserRouter` + `404.html` di fallback SPA. Modifica localizzata (`main.jsx`,
un `404.html`, lo snippet di decode in `index.html`).

## Dipendenze del build

Il workflow fa `npm ci` in **`data/`** e in **`ui/`**: `ui/` importa i moduli di
`data/`, che dipendono dall'SDK `firebase`. Senza le dipendenze di `data/` il
build fallisce a risolvere `firebase/firestore`.

## Fase 2 — abilitare il login

Da fare prima di qualsiasi accesso reale (dogfooding incluso, appena si vuole
usare il proprio account Google invece di utenti creati a mano).

### A. Console Firebase — Authentication

1. **Build → Authentication → Get started** (se non già fatto).
2. **Sign-in method → Google → Enable.** Support email: quella dell'istituto/tua.
3. **Settings → Authorized domains**: devono esserci `localhost` e
   **`isaquiz.trikkulab.it`** (aggiungilo).
4. Se l'istituto ha Google Workspace: l'OAuth consent screen (Google Cloud
   Console → APIs & Services → OAuth consent screen) può restare **Internal**,
   così solo gli account del dominio possono autorizzare l'app.

### B. Firestore — `config`

Console Firestore, oppure `scripts/seed.mjs` (`SEED_TARGET=prod …`, vedi §7):

- `config/current`: `dominioIstituzionale` = dominio reale;
  `docentiAutorizzati` = **email vere in minuscolo** dei docenti pilota;
  `nomeIstituto`, `annoScolasticoCorrente`.
- `config/istituto`: `{ dominioIstituzionale, nomeIstituto }` (stessi valori) —
  è il documento **pubblico** che la pagina `/accedi` legge senza login.

### C. Costante del dominio in `firestore.rules`

`dominioIstituzionale()` nel file rules → dominio reale (deve combaciare con
`config`). Cambiarlo richiede ri-deploy delle regole.

### D. Deploy di rules + functions (CLI)

Serve la Firebase CLI autenticata (finora mai fatto su questa macchina):

```sh
npx firebase login          # una tantum
npx firebase use <project-id>
npx firebase deploy --only firestore:rules,functions
```

Le tre function: `calcolaPunteggio` (trigger), `generaCodiceAccesso` e
`generaQuesiti` (callable), regione `europe-west8`. `functions/` ha il suo
`package.json` (Node 20). Il primo deploy functions può chiedere di abilitare
alcune API Google Cloud e un piano **Blaze** (il free tier resta ampio).

### E. Secret del build

I 6 `VITE_FIREBASE_*` (§5) bastano: `authDomain` è già tra quelli. Nessuna nuova
variabile per l'auth.

### F. Verifica

1. `https://isaquiz.trikkulab.it/#/accedi` → "Accedi con Google".
2. Con un account del dominio in `docentiAutorizzati` → atterra su `/docente`.
3. Con un account del dominio non in lista → `/studente`; `/docente` negato.
4. Con un account fuori dominio → errore "usa l'account della scuola", nessuna
   sessione.
5. Pubblica un quiz → il codice compare (lo genera la Cloud Function). Rispondi
   come studente → in Firestore la risposta prende `corretta`.

### Note

- I quiz demo del seed sono intestati a `rossi@istituto.example` (o a
  `SEED_DOCENTE_EMAIL`). In prod il docente vero, al primo login, ottiene un
  `utenti/{uid}` con ruolo docente ma **nessun corso**: non c'è ancora UI per
  creare un `CORSO`, quindi i `corsi`/`docenti_corso` vanno creati per il suo
  uid (ri-seed con `SEED_DOCENTE_EMAIL=<sua email>` dopo il suo primo login, o
  Admin SDK). Nodo noto, vedi `DECISIONI_DESIGN.md`.
- Emulatori in locale: `npm run emu` avvia anche Auth e Functions; `npm run
  seed` crea gli account Auth di prova.
