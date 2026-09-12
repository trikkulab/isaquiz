# Deploy — GitHub Pages

**Stato (settembre 2026): online e in uso per il dogfooding.** Progetto Firebase
reale creato su account privato dell'autore, regole e Cloud Functions
dispiegate, UI su GitHub Pages a `isaquiz.trikkulab.it`. Le sezioni 1–9 e "Fase
2 — abilitare il login" restano come **riferimento** (per rifare il setup —
soprattutto quando il progetto verrà ricreato nell'organizzazione dell'istituto
prima della Fase 5) e come **runbook operativo** (aggiungere un docente, nominare
un admin, ridispiegare le regole dopo una modifica).

**Operazioni ricorrenti** (dettaglio nelle sezioni sotto):
- modifica a `firestore.rules` → `npm run deploy:rules` (o `deploy:backend`);
- modifica alle Cloud Functions → `npm run deploy:functions`;
- nuovo docente pilota → §B-bis (email in `config/current.docentiAutorizzati`);
- nuovo amministratore → §B-ter (`utenti/{uid}.ruolo = "admin"` da console);
- UI → merge `dev` → `rel` (il workflow builda e pubblica).

## Come funziona

- Workflow: `.github/workflows/deploy.yml`. Builda `ui/` e pubblica su GitHub
  Pages **ad ogni push su `rel`** (o a mano dalla tab Actions → Run workflow).
- Dominio: **`https://isaquiz.trikkulab.it/`** (custom domain su GitHub Pages,
  `ui/public/CNAME`). Il workflow passa `VITE_BASE=/` (radice del dominio). Il
  vecchio URL `trikkulab.github.io/isaquiz/` viene rediretto qui da GitHub.
- Routing: **HashRouter** (`ui/src/main.jsx`). Gli URL hanno il `#`
  (`isaquiz.trikkulab.it/#/quiz/abc`). Scelta voluta: nessun `404.html` da tenere
  sincronizzato, refresh e link diretti funzionano sempre su hosting statico.
- **Firebase Hosting non si usa.** `firebase.json` non ha un blocco `hosting`
  apposta: `firebase deploy` senza `--only` tocca solo Firestore rules +
  functions, mai la UI (che sta su Pages).

## Setup una tantum — creare il progetto Firebase reale

*Già fatto per il progetto attuale (account privato). Da rifare quando il
progetto passerà nell'organizzazione dell'istituto (§A, nota Fase 5).*

Il grosso è da **console web**; il deploy di regole/functions è da CLI
(`firebase login` già fatto su questa macchina). Regione Firestore:
**`europe-west8` (Milano)** — dati in Italia, coerente con `docs/analisi-gdpr.md`.
**La regione è permanente.**

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

`firestore.rules` nel repo è la fonte di verità. Si dispiegano da CLI —
`npm run deploy:rules` (§D) — mai a mano dalla console.

> **Dominio istituzionale**: in `firestore.rules`, `dominioIstituzionale()`
> ritorna `'isarome.it'` (il dominio Google Workspace di questo istituto). Se
> cambia, aggiornalo qui, in `scripts/seed.mjs` (`DOMINIO`) e in
> `config/current` + `config/istituto` su Firestore, poi ripubblica le regole.

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

### 7. `config` del DB reale (seed o console)

1. **Impostazioni progetto → Account di servizio → Genera nuova chiave privata** →
   salva il `.json` nella root del repo (è già in `.gitignore`) o altrove.
2. Dalla root del repo — **modalità "solo config"** (consigliata per un progetto
   reale: i docenti creeranno da sé corsi e quiz, niente dati demo):
   ```sh
   SEED_TARGET=prod \
   SEED_PROJECT_ID=<project-id> \
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
   SEED_CONFIRM=<project-id> \
   SEED_SOLO_CONFIG=true \
   SEED_DOMINIO=<dominio Workspace> \
   SEED_NOME_ISTITUTO="<nome esteso dell'istituto>" \
   SEED_DOCENTI="prof1@dominio,prof2@dominio" \
   npm run seed
   ```
   Scrive **solo** `config/current` + `config/istituto`. `SEED_DOCENTI` imposta
   l'intera lista `docentiAutorizzati` (**sovrascrive** — poi gestiscila a mano,
   §B-bis).
   *Senza* `SEED_SOLO_CONFIG` il seed popola anche i dati demo (`utenti`,
   `classi`, `corsi`, `quesiti`, 3 quiz + codici `TEST01`/`TEST02`) intestati a
   `SEED_DOCENTE_EMAIL` — utile solo per un ambiente di prova, non per il pilota.
   L'admin demo (`mock-admin-1`) **non** viene mai creato in prod.
3. **Revoca la chiave** dalla console quando hai finito (o tienila al sicuro per i
   re-run). Il seed è idempotente.

> `DOMINIO` di default è `isarome.it` (override con `SEED_DOMINIO`); il nome
> istituto di default resta `IIS Esempio` finché non passi `SEED_NOME_ISTITUTO`.
> `annoScolasticoCorrente` e `codiceMeccanografico` in `config/current` vanno
> comunque controllati a mano in console.

### 8. Primo deploy

Merge `dev` → `rel` (o push su `rel`). La tab **Actions** builda e pubblica su
`https://isaquiz.trikkulab.it/`.

### 9. Verifica end-to-end

1. `https://isaquiz.trikkulab.it/#/accedi` → "Accedi con Google" (schermata,
   niente errori) — conferma che i secret del build ci sono.
2. Login con un'email in `docentiAutorizzati` → atterra su `/docente`; "Crea
   nuovo quiz" rimanda a `/docente/corsi` finché non c'è un corso.
3. Crea un corso in `/docente/corsi` → deve funzionare. Se dà `permission-denied`:
   regole non aggiornate → `npm run deploy:rules`.
4. Pubblica un quiz → compare il codice (lo genera la Cloud Function) → apri il
   codice su un telefono e rispondi → in Firestore la risposta prende `corretta`.

(Se hai lanciato il seed *senza* `SEED_SOLO_CONFIG` esistono anche i codici demo
`TEST01`/`TEST02` e i 3 quiz di prova.)

Se le schermate dati vanno in errore: secret mancanti/errati (§5) o regole non
pubblicate (§D).

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
4. **OAuth consent screen** (GCP Console → API e servizi → Schermata consenso):
   - progetto dentro l'organizzazione Google Cloud dell'istituto → **Internal**;
   - progetto su account privato (stato attuale) → solo **External** possibile.
     Modalità "Testing" + test users a mano per il dogfooding; scope solo
     `email`/`profile` → nessuna verifica Google richiesta. La restrizione al
     dominio la fanno comunque `hd` + `authProvider` + `isDominio()` nelle rules.
5. **Autorizzazione lato Workspace (serve il super-admin dell'istituto).** Molti
   Workspace (Education, account minorenni) bloccano di default le app OAuth di
   terze parti: l'admin deve rendere **"Trusted"** l'OAuth Client ID di isaquiz
   in *Admin console → Sicurezza → Controlli API → Controllo accesso alle app*.
   Il Client ID è in GCP Console → API e servizi → Credenziali (compare dopo aver
   abilitato il provider Google al punto 2). Serve **già per il dogfooding** se
   si accede con un account della scuola.

> **Prima della Fase 5 (pilota con studenti)** il progetto Firebase va ricreato
> nell'organizzazione Google Cloud dell'istituto (owner + billing istituzionali):
> un progetto su account privato non regge la nomina a responsabile del
> trattamento e la DPIA (`docs/analisi-gdpr.md`). Nessuna migrazione dati — si
> rifà il setup e `SEED_TARGET=prod npm run seed`. Vedi `DECISIONI_DESIGN.md`,
> "Progetto Firebase: account privato ora, organizzazione dell'istituto prima
> del pilota".

### B. Firestore — `config`

Console Firestore, oppure `scripts/seed.mjs` (`SEED_TARGET=prod …`, vedi §7):

- `config/current`: `dominioIstituzionale` = dominio reale;
  `docentiAutorizzati` = **email vere in minuscolo** dei docenti pilota;
  `nomeIstituto`, `annoScolasticoCorrente`.
- `config/istituto`: `{ dominioIstituzionale, nomeIstituto }` (stessi valori) —
  è il documento **pubblico** che la pagina `/accedi` legge senza login.

### B-bis. Autorizzare un nuovo docente

Non c'è UI per questo (è la frontiera di sicurezza: "mai autoregistrazione"). Per
aggiungere un collega docente:

1. Console Firestore → `config/current` → aggiungi la sua **email in minuscolo**
   all'array `docentiAutorizzati`. (In alternativa, ri-seed con
   `SEED_TARGET=prod` — ma il seed *sovrascrive* l'array con la sola
   `SEED_DOCENTE_EMAIL`, quindi in prod conviene la modifica manuale.)
2. Il docente fa login almeno una volta → risulta `isDocente` (calcolato dalla
   lista, non un campo) e atterra su `/docente`.
3. Da lì crea da sé i propri corsi (`/docente/corsi`) — non serve nessun
   intervento admin per i corsi. Vedi `DECISIONI_DESIGN.md`, "Onboarding docente
   e creazione corsi".

Togliere un'email dall'array fa tornare la persona studente al login successivo.

### B-ter. Nominare un amministratore

Il ruolo `admin` si assegna **solo** da console (mai dall'app), e **dopo** che
la persona ha fatto login almeno una volta (così esiste `utenti/{uid}`):

1. Console Firestore → `utenti/{uid}` della persona → campo `ruolo` = `admin`.
2. Al login successivo il provisioning legge quel campo (non lo scrive mai) e la
   persona risulta `isAdmin`.
3. La persona vede l'area Admin (sola lettura: corsi dell'istituto, elenco
   docenti autorizzati, impostazioni) oltre a Studente. Vede anche Docente solo
   se la sua email è pure in `docentiAutorizzati` — le due cose sono
   indipendenti.

Per togliere l'admin: reimpostare `ruolo` a `docente`/`studente` da console.

> **Nota.** Un cambio di `config/current.docentiAutorizzati` o di
> `utenti/{uid}.ruolo` ha effetto **al prossimo provisioning**, cioè a un
> **login pulito o a un reload completo della pagina** — non basta navigare
> nell'app se la sessione è ancora attiva. In sviluppo: modificare il DB
> nell'Emulator UI mentre si è loggati non aggiorna la UI finché non si ricarica
> (`onAuthStateChanged` rifà `provisionUtente` solo al reload / logout-login).

### B-quater. Abilitare la generazione IA interna (percorso autore)

Percorso IA interno (Fase 3, vedi `DECISIONI_DESIGN.md`, "Generazione domande:
interna vs esterna"): riservato all'autore per dogfooding, mai aperto a tutti i
docenti (una sola chiave API condivisa esaurirebbe il free tier). Due passi,
entrambi da console/CLI — **niente qui è impostabile dall'app**:

1. **Chiave API del provider** (Google AI Studio, [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
   come secret della function:
   ```sh
   npx firebase functions:secrets:set GEMINI_API_KEY
   # incolla la key al prompt — non finisce in nessun file del repo
   npm run deploy:functions
   ```
   In locale (emulatore): stesso valore in `functions/.secret.local`
   (`GEMINI_API_KEY=...`, file ignorato da git — pattern `*.local`).
2. **Flag sull'utente autore**: Console Firestore → `utenti/{uid}` (l'uid
   dell'autore, non un docente demo) → campo `generazioneIA` = `true`. Verificato
   dalla Cloud Function ad ogni chiamata, non solo alla creazione dell'utente.
   Il contatore giornaliero (`richiesteIAOggi` + `richiesteIADataOggi`, limite
   a mano in `functions/aiProvider.js`) lo scrive solo la function stessa —
   nessun intervento manuale necessario, si azzera da sé al cambio giorno.

In emulatore, `npm run seed` imposta già `generazioneIA: true` sul docente demo
— comodo per lo sviluppo, ma quel valore non tocca mai prod (il seed su prod
scrive solo se non si usa `SEED_SOLO_CONFIG=true`, e comunque non è l'utente
reale dell'autore).

> **Insidie note (verificate 2026-09, possono cambiare)**:
> - **`.secret.local` va letto solo all'avvio**: modificarlo mentre
>   l'emulatore functions è già in esecuzione non ha effetto — va fermato e
>   riavviato. Il codice sorgente delle function invece si ricarica da solo.
> - **Nome del modello**: verificare che il modello scelto in
>   `functions/aiProvider.js` (costante `MODELLO`) sia ancora disponibile —
>   Google ne ritira/rinomina periodicamente (es. `gemini-2.5-flash` non più
>   utilizzabile da chiavi nuove a settembre 2026, sostituito da
>   `gemini-3.6-flash`). L'errore del provider indica sempre il nome
>   sostitutivo consigliato.
> - **Progetto AI Studio in stato "Prepay required"**: non tutti i progetti
>   nuovi restano nel free tier puro — alcuni (dipende da come sono stati
>   creati) richiedono un saldo prepagato per qualunque chiamata, anche sui
>   modelli Flash. Su [ai.studio/projects](https://ai.studio/projects) si vede
>   lo stato di ogni progetto: se quello con cui hai generato la key mostra
>   "Prepay required", prova a generarne una nuova sotto **"Default Gemini
>   Project"** (o un altro progetto ancora in "Free tier" senza quel badge)
>   invece di attivare la fatturazione.

### C. Costante del dominio in `firestore.rules`

`dominioIstituzionale()` nel file rules → dominio reale (deve combaciare con
`config`). Cambiarlo richiede ri-deploy delle regole.

### D. Deploy di rules + functions (CLI)

`firebase login` già fatto su questa macchina. Prima volta in una sessione,
seleziona il progetto reale (il default in `.firebaserc` è `demo-isaquiz`, che
serve solo all'emulatore):

```sh
npx firebase use <project-id>          # una volta per progetto
npm run deploy:backend                 # = firebase deploy --only firestore:rules,functions
# oppure separati:
npm run deploy:rules
npm run deploy:functions
```

Le tre function: `calcolaPunteggio` (trigger `onDocumentWritten`),
`generaCodiceAccesso` e `generaQuesiti` (callable — percorso IA interno, Fase
3, vedi §B-quater per l'abilitazione), regione `europe-west8`. `functions/`
gira su **Node 22** (firebase-functions 6, firebase-admin 13). Il primo deploy
functions può chiedere di abilitare alcune API Google Cloud e il piano
**Blaze** (free tier ampio).

> **`firestore.rules` è la fonte di verità**: ogni volta che cambia (es. i commit
> su corsi/`docenti_corso` e sul write di `utenti` di set-2026) va rieseguito
> `npm run deploy:rules`. Se una scrittura che dovrebbe funzionare dà
> `permission-denied` online, quasi sempre le regole dispiegate sono vecchie.

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

- I quiz demo del seed sono intestati a `rossi@isarome.it` (o a
  `SEED_DOCENTE_EMAIL`). In prod il docente vero, al primo login, ottiene un
  `utenti/{uid}` con ruolo docente e **nessun corso**: se li crea da sé in
  `/docente/corsi` (non serve più seed/Admin SDK per questo). Il seed serve solo
  se si vogliono anche i *quiz/quesiti* demo intestati a lui.
- Emulatori in locale: `npm run emu` avvia anche Auth e Functions; `npm run
  seed` crea gli account Auth di prova.
