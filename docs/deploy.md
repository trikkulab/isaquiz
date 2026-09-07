# Deploy — GitHub Pages

Stato: **coda Fase 0**. Obiettivo di questo deploy: avere l'app raggiungibile da
dispositivi reali per il dogfooding (docente + qualche collega). **Non** per uso
con studenti — manca il login vero (Fase 2), le regole Firestore sono ancora
permissive.

## Come funziona

- Workflow: `.github/workflows/deploy.yml`. Builda `ui/` e pubblica su GitHub
  Pages **ad ogni push su `rel`** (o a mano dalla tab Actions → Run workflow).
- La app è servita come **project page**: `https://trikkulab.github.io/isaquiz/`.
  Il workflow passa `VITE_BASE=/isaquiz/` al build (in locale la base resta `/`).
- Routing: **HashRouter** (`ui/src/main.jsx`). Gli URL hanno il `#`
  (`.../isaquiz/#/quiz/abc`). Scelta voluta: nessun `404.html` da tenere
  sincronizzato, refresh e link diretti funzionano sempre su hosting statico.

## Setup una tantum (sul repo trikkulab/isaquiz)

1. **Settings → Pages → Source**: `GitHub Actions`.
2. **Settings → Secrets and variables → Actions → New repository secret**, i 6
   valori della web-config del progetto Firebase reale (Console Firebase →
   Impostazioni progetto → "Le tue app" → SDK setup and configuration):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

   Finché i secret non ci sono il build passa comunque, ma le schermate che
   leggono/scrivono dati vanno in errore a runtime (nessun progetto Firebase da
   contattare). È l'interim accettato: solo per vedere l'UI live.
3. Merge di `deploy-pages` → `dev` → `rel` (o push diretto su `rel`) per far
   partire il primo deploy.

## Passaggio al dominio custom (quando sarà attivo)

Modifica minima:

1. `.github/workflows/deploy.yml`: `VITE_BASE: /` (invece di `/isaquiz/`).
2. `ui/public/CNAME` con il dominio (una riga). Il file viene copiato tal quale
   in `dist/`.
3. DNS del dominio → record per GitHub Pages (`A` verso gli IP di GitHub, o
   `CNAME` verso `trikkulab.github.io`).
4. **Settings → Pages → Custom domain**: inserisci il dominio, attendi il check,
   spunta "Enforce HTTPS".

Nessuna modifica al codice: i link/QR si costruiscono da `import.meta.env.BASE_URL`
(vedi `ui/src/components/AccessoQuiz.jsx`).

Opzionale, dopo il dominio: se il `#` negli URL dà fastidio si può tornare a
`BrowserRouter` + `404.html` di fallback SPA. È una modifica localizzata
(`main.jsx`, un `404.html`, e lo snippet di decode in `index.html`).

## Dipendenze del build

Il workflow fa `npm ci` in **`data/`** e in **`ui/`**: `ui/` importa i moduli di
`data/`, che dipendono dall'SDK `firebase`. Senza le dipendenze di `data/` il
build fallisce a risolvere `firebase/firestore`.
