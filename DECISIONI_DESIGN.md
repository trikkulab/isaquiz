# Decisioni di design — isaquiz

Sintesi delle scelte UX e architetturali prese durante la progettazione, con la
motivazione. Non è un verbale della discussione: solo le decisioni finali,
utile a chi riprende il progetto (anche lo stesso autore, fra qualche settimana)
senza dover ricostruire il ragionamento da capo.

## Terminologia

**"Quesito" (non "domanda") per l'item del quiz; "opzioni" (non "risposte")
per le sue alternative di scelta multipla.** Un quesito è composto da una
domanda (il testo) e da opzioni tra cui scegliere — "quesito" è il termine
corretto per l'intero item, coerente con l'uso scolastico italiano (es.
INVALSI). Deliberatamente NON si usa "risposte" per le opzioni di un quesito,
perché "risposta/`RISPOSTA`" è già un'entità distinta e consolidata nel
dominio: quello che lo studente ha effettivamente scelto (`risposteRepository.js`,
collezione Firestore `risposte`, con `corretta`/`timestamp`/`studenteId`).
Usare la stessa parola per due concetti diversi (le 4 alternative tra cui
scegliere vs. la scelta effettiva dello studente) avrebbe reintrodotto
un'ambiguità che il resto della documentazione si sforza di evitare. Quindi:
`QuesitoCard`, `quesitiRepository.js`, `quiz.quesiti`, campo `quesitoId` su
`RISPOSTA` — ma `quesito.opzioni` resta `opzioni`, mai `risposte`.

## Sviluppo

**Mock auth prima, login vero solo per i ragazzi.** Si è sviluppato con
un'autenticazione fittizia finché il flusso non è stato stabile; in **Fase 2**
`data/mockAuth.js` è stato sostituito da Firebase Auth con Google
(`data/authProvider.js`). Nessuno studente deve usare la piattaforma prima che il
login vero sia attivo — è una scelta didattica, non solo tecnica: i ragazzi
vedono solo il prodotto finito. Dettaglio sotto, "Autenticazione e provisioning
utente".

**Emulatore Firestore, non un progetto Firebase reale, finché non serve.** Lo
sviluppo gira sull'emulatore (`firebase-tools`, progetto `demo-isaquiz` — il
prefisso `demo-` fa sì che l'emulatore non chieda credenziali né contatti
servizi reali). `scripts/seed.mjs` (usa `firebase-admin`) popola dati di prova
in modo idempotente. Il tooling vive in un `package.json` alla radice
(`npm run emu`, `npm run seed`); l'SDK Firebase client è dipendenza di
`data/package.json`, non di `ui/`, perché solo `data/` parla con Firestore.
`firestore.rules` in Fase 2 non è più un placeholder: regole reali legate a
`request.auth` (vedi sotto, "Security rules").

## Modello dati: classi, corsi, iscrizioni (multi-anno)

**Corso, non classe, come contenitore dei quiz.** Sul modello di Google
Classroom: non esiste un'unica "3AINF" che contiene tutti i quiz di tutte le
materie. Esiste un `CORSO` per ogni combinazione materia più anno scolastico
(es. "Informatica 3AINF 2025/26"), ciascuno con il proprio codice di accesso.
Risolve anche il caso titolare più assistente: due insegnanti sono semplicemente
due righe collegate allo stesso corso, con ruoli diversi, non un'eccezione da
gestire a parte.

**"Classe" resta, ma come unità amministrativa separata dai corsi.** Un
coordinatore ha bisogno di una vista d'insieme sugli studenti di una classe,
trasversale alle materie — cosa che il solo concetto di "corso" non copre.
`CLASSE` esiste quindi come entità a sé, con una propria iscrizione
(`ISCRIZIONE_CLASSE`) distinta da quella al singolo corso (`ISCRIZIONE_CORSO`):
uno studente può essere ufficialmente in una classe senza essersi ancora
iscritto a tutti i corsi delle materie che la compongono (es. un docente che
non ha ancora attivato isaquiz).

**Nota GDPR — vista coordinatore prevista by design, non implementata prima
della Fase 4/5.** Lo schema supporta fin da subito la relazione
docente-coordinatore-classe, ma nessuna vista aggregata cross-materia va
costruita prima di aver passato dalla DPIA (vedi analisi GDPR, sezione 6):
un cruscotto che mostra a un coordinatore i dati di più materie insieme è
esattamente il tipo di funzionalità di sorveglianza che l'analisi raccomanda
di valutare con attenzione prima di costruirla, non dopo.

**Nessuna migrazione dati tra anni scolastici.** Cambio anno, promozione,
bocciatura: si creano nuove righe (`CLASSE`, `CORSO`, iscrizioni), le vecchie
restano intatte per sempre. Un valore singolo in `CONFIG` (l'anno scolastico
corrente) invalida automaticamente i codici delle annate precedenti, senza
bisogno di far scadere ogni codice singolarmente.

**Utente: tabella unica per persona, ruolo sempre contestuale al corso.**
Non esistono tabelle separate `STUDENTE` e `DOCENTE`: un'unica `UTENTE`
(email, nome, cognome, ruolo, classeId) rappresenta la persona. Il campo
`ruolo` su `UTENTE` è solo una cache di comodo — decide quale dashboard
mostrare di default al login — mai la fonte di verità su cosa quella persona
fosse in un corso specifico in un dato momento. La fonte di verità è sempre
la riga di collegamento pertinente: `ISCRIZIONE_CORSO` (studente in quel
corso), `DOCENTE_CORSO` con `ruolo: titolare` o `assistente` (docente in quel
corso), `DOCENTE_CLASSE` con `ruolo: coordinatore`. Questo è ciò che permette,
senza alcuna struttura ad hoc, il caso di uno studente che l'anno successivo
torna come docente: stesso account, ruolo attuale aggiornato in `UTENTE`,
storico di iscrizioni passate come studente intatto e mai in conflitto con le
nuove righe da docente.

**Ruolo docente: assegnato per appartenenza a una lista, non per
autoregistrazione.** Al login (dominio istituzionale via `hd`), il sistema
verifica se l'email è tra i `docentiAutorizzati` in `CONFIG`. Se sì, ruolo
docente da quel momento; se no, resta studente (ruolo di default, dashboard
vuota finché non arrivano iscrizioni). Il controllo avviene a ogni login, non
solo al primo: aggiungere un'email alla lista mentre l'utente è già loggato
ha effetto dal login successivo, non richiede nessuna azione da parte sua.
Nessun flusso di autoregistrazione a ruolo docente dentro l'app: è un
possibile buco di sicurezza da evitare esplicitamente.

**Amministratore: cruscotto minimale, non workflow di approvazione.** Un
ruolo `admin`, assegnato scrivendo direttamente su Firestore (mai tramite
un flusso nell'app), dà accesso a una pagina protetta con: lista email
autorizzate come docente (editabile), tabella dei corsi esistenti (per
individuare doppioni), bottone di disattivazione corso per casi eccezionali.
Deliberatamente non un sistema con notifiche e coda di richieste in attesa:
sovradimensionato per un progetto con un amministratore e pochi docenti
pilota.

## Multi-istituto

**Un istituto per installazione, non multi-tenant.** Non esiste (né è
previsto) un campo di scoping per istituto su `UTENTE`, `CORSO`, `CLASSE` o
altre entità: l'auth è pensata per un solo dominio Google Workspace (`hd`), e
`CONFIG.docentiAutorizzati` è una lista piatta unica, non divisa per scuola.

**`CONFIG.nomeIstituto` e `CONFIG.codiceMeccanografico`** identificano quale
istituto sta usando questa installazione — servono per coerenza interna
(footer, informative) e amministrativa, NON per isolare i dati di più
istituti nella stessa base dati: quello resta fuori scope.

**In UI: nel footer delle pagine "contenitore" (accanto a `CreditoTecnico`),
mai nell'header di `QuizStudente`.** Stesso ragionamento già fatto per il
credito tecnico: la schermata di svolgimento del quiz resta minimale per
vincolo di semplicità/immediatezza, il nome dell'istituto è contesto
amministrativo/legale, non informazione che serve allo studente in quel
momento. A differenza del credito tecnico però `nomeIstituto` non è testo
statico compilato nel codice — vive su Firestore, quindi mostrarlo per
davvero richiede un `data/configRepository.js` (non ancora creato) e
`CONFIG` popolato per davvero, non un mock. Rimandato apposta: niente dato
finto che sembra reale nel frattempo.

**Perché non semplicemente "aggiungere un filtro per istituto" più avanti.**
L'analisi GDPR (`docs/analisi-gdpr.md`) segnala che una banca dati condivisa
tra istituti autonomi è un caso di **contitolarità** (art. 26 GDPR): ogni
istituto è un titolare del trattamento distinto, e condividere dati tra
titolari diversi richiede un accordo dedicato che regoli responsabilità,
informative e consensi — non è un dettaglio implementativo rimandabile a
quando servisse, cambia l'architettura di consensi fin dall'inizio di quella
funzionalità. Per questo "multi-istituto" non è modellato nemmeno
parzialmente ora: aggiungere un `istitutoId` "per sicurezza" darebbe la falsa
impressione che l'isolamento dati sia già gestito, quando in realtà mancano
ancora le basi legali (contitolarità) per farlo bene.

**Percorso pratico se servisse un secondo istituto prima di un eventuale
redesign multi-tenant**: una seconda installazione separata (proprio progetto
Firebase, proprio `CONFIG`, proprio dominio Google) — zero dati condivisi tra
le due, zero problemi di contitolarità, perché restano titolari del tutto
indipendenti.

## Autenticazione e provisioning utente (Fase 2)

**Firebase Auth + Google, ristretto al dominio istituzionale.** Unico provider
(niente email/password). `data/authProvider.js` è il solo punto che parla con
Firebase Auth; la UI riceve l'utente da `ui/src/auth/AuthContext.jsx` e protegge
le route con `RichiediAuth`. `data/mockAuth.js` è stato rimosso.

**Il dominio si controlla in tre punti, e va bene così.**
- `hd` come *hint* nel popup Google (pre-seleziona l'account Workspace) — non è
  un controllo, Google lo tratta come suggerimento;
- controllo esplicito in `authProvider` subito dopo il login (email fuori
  dominio → `signOut` + `ErroreDominio`) e di nuovo alla ripresa di sessione;
- **controllo vero** nelle security rules (`isDominio()`).

Il dominio vive come **costante nel file `firestore.rules`** e come documento
**pubblico** `config/istituto` (`{ dominioIstituzionale, nomeIstituto }`,
leggibile senza login perché serve alla pagina `/accedi`). La lista
`docentiAutorizzati` resta in `config/current`, dietro autenticazione — non si
espone una lista di email a chi non è loggato. Duplicazione dominio
(rules + config) accettata: un'installazione = un istituto, cambiarlo è raro e
consapevole.

**Provisioning a ogni login, non solo al primo.** `ascoltaUtenteCorrente`, a
ogni `onAuthStateChanged` con utente:
1. rilegge `docentiAutorizzati`;
2. `ruolo = lista.include(email) ? "docente" : "studente"` — **ricalcolato ogni
   volta**: togliere un'email dalla lista fa tornare studente al login
   successivo, senza azioni sull'utente;
3. `upsert` di `utenti/{uid}` (merge) con `email/nome/cognome/photoURL` da
   Google + `ruolo`. `uid` di Firebase Auth = id del documento.

Il ruolo `admin` non è mai scrivibile dall'app (rules: `ruolo in
['studente','docente']`), solo da console — coerente con "Amministratore:
cruscotto minimale".

**`nickname` / `avatarEmoji` / `livello`: default deterministici, non
onboarding.** Passando dall'utente mock (che aveva questi campi) all'account
Google reale si sarebbe persa l'estetica "studente" già costruita
(`BarraQuiz`, `StudenteHome`). Invece di una schermata di onboarding (rimandata),
`authProvider` genera default stabili: `nickname` = nome proprio (o parte locale
dell'email), `avatarEmoji` scelto per hash dell'uid (così non cambia tra login),
`livello` = 1. Scritti solo se assenti: un domani un onboarding vero potrà
sovrascriverli. `livello` resta puro display finché non c'è la gamification
(Fase 4).

**Onboarding docente / creazione corsi: ancora scoperto.** Non c'è UI per creare
un `CORSO`: un docente reale è operativo solo se `corsi`/`docenti_corso` esistono
già per il suo uid. Nodo noto (era "Non ancora deciso"), da sciogliere prima di
allargare i docenti pilota. Il seed può intestare i dati demo all'account con cui
si fa login (`SEED_DOCENTE_EMAIL`), e in prod risolve l'uid del docente per email
(che deve aver fatto login almeno una volta).

## Security rules (Fase 2) — minime ma reali

**Obiettivo dichiarato: sbloccare l'uso con studenti, non blindare ogni
invariante.** Le regole in `firestore.rules` legano tutto a `request.auth` e
coprono i casi che contano davvero:
- `corretta` su `RISPOSTA` non scrivibile dal client (create senza il campo;
  update solo su `rispostaData`/`timestamp`);
- risposte solo del proprio `studenteId`, solo su quiz `attivo`;
- niente escalation di ruolo (`admin` vietato, `docente` solo se in lista);
- quiz e quesiti scrivibili solo da chi si dichiara autore;
- `codici_accesso` non scrivibile dal client (solo la Cloud Function);
- lettura di un quiz `bozza` riservata all'autore.

**Cosa NON è ancora verificato** (elencato anche nel commento in testa al file e
nella memory `project_rules_firestore_da_rafforzare`):
- lettura di `utenti` / `corsi` / `quesiti` è larga (chiunque del dominio) —
  serve oggi perché lo studente carica quiz+quesiti e il docente i nomi degli
  studenti; un `indiceCorretto` è quindi enumerabile da un utente del dominio
  che indovini gli id;
- transizioni di stato del quiz e immutabilità del contenuto dopo la
  pubblicazione;
- invarianti di versionamento dei quesiti (baseId/versione, no edit in place);
- forma/completezza dei documenti scritti.

Il rafforzamento è un lavoro a parte, non un blocco per il primo uso.

## Progetto Firebase: account privato ora, organizzazione dell'istituto prima del pilota

**Stato attuale (settembre 2026): il progetto Firebase è su un account Google
privato dell'autore.** Va bene per il dogfooding, **non** per la
sperimentazione con studenti (Fase 5).

**Cosa comporta un progetto su account privato:**

- La schermata di consenso OAuth può essere solo **"External"**, mai
  "Internal" (che richiede il progetto dentro l'organizzazione Google Cloud
  dell'istituto). Non è un problema *funzionale*: la restrizione al dominio la
  fanno comunque l'hint `hd`, il controllo in `data/authProvider.js` e
  `isDominio()` nelle rules. In modalità "Testing" bastano pochi *test users*
  aggiunti a mano; con scope non sensibili (`email`/`profile`) non serve la
  verifica di Google.
- **Il contratto con Google (Firebase ToS) e la fatturazione Blaze** (necessaria
  per le Cloud Functions) sono a nome dell'account privato. Questo è
  incompatibile con la nomina dell'autore a **responsabile del trattamento**
  (art. 28) e con la DPIA descritte in `docs/analisi-gdpr.md`: i dati di
  studenti minori non possono stare su un progetto la cui titolarità
  contrattuale è di un privato.

**Decisione: prima della Fase 5 il progetto va ricreato dentro l'organizzazione
Google Cloud dell'istituto**, con owner e billing istituzionali. Non si "migra"
il progetto esistente: non c'è nulla di reale da conservare e `scripts/seed.mjs`
sa già ripopolare (`SEED_TARGET=prod`) — coerente con il principio "nessuna
migrazione" del progetto. Serve l'intervento del super-admin Workspace
dell'istituto per creare il progetto nell'organizzazione (o concedere il
permesso di crearlo lì).

**Indipendente da questo, e comunque necessario:** molti Workspace (soprattutto
edizione Education, e per gli account di minorenni) **bloccano di default le app
OAuth di terze parti non configurate**. Il super-admin deve rendere
**"attendibile" (Trusted)** l'OAuth Client ID di isaquiz in *Admin console →
Sicurezza → Controlli API → Controllo dell'accesso alle app*, altrimenti anche
un login perfettamente configurato viene bloccato. Vale già per il dogfooding
se si usa un account della scuola. Vedi runbook in `docs/deploy.md`, "Fase 2 —
abilitare il login".

## Flusso quiz studente

- **Solo avanti, niente tasto indietro.** Coerente con "verifica immediata", non
  un esame formale; evita che tornare indietro diventi un modo per "correggersi".
- **Ritmo libero per studente, non sincronizzato dal docente.** Niente
  infrastruttura realtime tipo Kahoot — chi finisce prima non aspetta gli altri.
- **Feedback immediato solo ✓/✗, spiegazione completa differita al riepilogo
  finale.** Evita che uno studente veloce dica ad alta voce la spiegazione a un
  compagno ancora sullo stesso quesito.
- **Durante il quiz non si mostra nemmeno QUALE fosse la risposta corretta**
  (non solo la spiegazione) — non è un'incoerenza rispetto al caso "risposta
  giusta" (dove lo studente la conosce già, è quella che ha scelto): è
  l'informazione più facile da suggerire a voce a un compagno, quindi la prima
  da proteggere. La prop che rivela la risposta corretta su `QuesitoCard`
  esiste solo nel contesto `QuizRisultati`, mai durante lo svolgimento.
- **`corretta` si calcola lato server (dalla Fase 2); il calcolo client resta
  solo per il display immediato.** `functions/calcolaPunteggio.js` (trigger
  `onDocumentWritten` su `risposte/{id}`) scrive `corretta`; le security rules
  vietano al client di toccare quel campo. In UI il confronto `opzioneScelta`
  vs `indiceCorretto` resta per mostrare subito ✓/✗ e per
  `RisultatiDocente`/`QuizRisultati` — non è più la fonte di verità. Il costo
  (un'invocazione per risposta) in Fase 1 era stato rimandato; con Fase 2 lo si
  è accettato: a scala pilota è trascurabile e serviva comunque per le rules su
  `corretta`. Nota residua: `indiceCorretto` arriva comunque al client col
  quesito — chi ispeziona lo stato React vede in anticipo le risposte del quiz
  corrente. Accettato (contesto didattico di informatica). Vedi anche "Modello
  dati: le risposte (granulari, non aggregate)": un documento per risposta rende
  banale la regola che vieta al client di scrivere `corretta`.

## Correzione (`QuizRisultati`)

- **Componente "contenuto puro"**: riceve `quiz` (con quesiti risolti) e
  `risposte` (`{ [quesitoId]: opzioneScelta }`) come **prop**. Non sa se è
  pagina intera, modale o pannello, né da dove vengono i dati. Chi lo monta
  li procura: `QuizRisultatiPagina` usa lo `state` di navigazione se si
  arriva da `QuizStudente`, altrimenti li rilegge da Firestore
  (`getQuizConQuesiti` + `getRisposteStudente`) per link diretto / refresh.
- **Tag di argomento sempre visibile su ogni quesito**, anche in un quiz misto
  (es. un ripasso con più argomenti) — così il quiz è identico ovunque lo apri,
  nessuna versione "filtrata" a seconda del punto di ingresso.
- **Risultati lato docente** (`RisultatiDocente`, route
  `/docente/quiz/:quizId/risultati`): tabella studente × punteggio +
  "per quesito" (quante corrette su quante risposte). Diverso dalle
  "Statistiche studente" qui sotto (per-argomento, Fase 4/5): questa è la
  vista base "com'è andata la classe su questo quiz", MVP Fase 1, e riguarda
  un solo quiz del suo autore — non è la vista coordinatore cross-materia
  soggetta a DPIA. **In tempo reale** (`ascoltaRisposteQuiz` → `onSnapshot`):
  le risposte compaiono mentre la classe risponde. Punteggio calcolato lato
  client (`opzioneScelta` vs `indiceCorretto`), `corretta` su `RISPOSTA`
  resta server-only. Nota: qui il realtime è per il *cruscotto del docente* —
  non contraddice "niente realtime tipo Kahoot" in "Flusso quiz studente",
  che riguarda la sincronizzazione tra studenti.

## Statistiche studente

- **Aggregazione per argomento**, non per singolo quiz — più utile per capire
  dove lo studente è debole. Un quiz misto contribuisce a più argomenti: è
  corretto, non un errore di conteggio.
- **Drill-down come accordion** (non nuova route): click su un argomento espande
  la lista dei quiz che lo contengono, senza perdere il contesto dei filtri.
- **Punteggio mostrato nella lista è quello CONTESTUALE** ("3/4 su questo
  argomento"), non il totale del quiz — risponde insieme a "quanti quesiti di
  questo argomento c'erano" e "quante ne ho azzeccate". Il punteggio totale del
  quiz si vede solo aprendo la correzione completa.
- **Correzione: modale con bottone esplicito "Apri come pagina".** Niente
  sincronizzazione automatica con l'URL (troppo complesso per il beneficio):
  il modale è la via rapida, il bottone è per chi vuole condividere il link o
  vedere la correzione a schermo intero.

## Layout adattivo (non solo responsive)

Sopra una soglia di larghezza (indicativa: 960px, vedi `useBreakpoint.js`), la
schermata statistiche si riorganizza, non solo si allarga:

- **Sotto la soglia**: `AccordionArgomenti` + `ModaleCorrezione` (overlay).
- **Sopra la soglia**: `PannelloArgomenti`, layout master-detail — lista
  argomenti a sinistra, dettaglio (lista quiz + correzione inline quando un
  quiz è selezionato) a destra, senza modale.

Il contenuto (`QuizRisultati`) resta identico nei due casi: cambia solo il
contenitore che lo monta. Stesso principio vale per eventuali grafici futuri
(non ancora implementati): i dati aggregati vivono nel repository, la UI decide
solo come disporli in base allo spazio disponibile.

## Sistema colore

**Il colore porta informazione, non è decorazione.** Ogni tinta del progetto
ha un *ruolo* preciso; la scelta di quale colore usare non è mai estetica.

**Regola fissa: nessun colore hard-coded nei componenti.** Tutti i colori
vivono come token `--color-*` in `@theme` dentro `ui/src/index.css`. Se serve
un colore nuovo si aggiunge un token lì, con un nome che dice il **ruolo** (a
cosa serve: `--color-superficie`, `--color-stato-chiuso`), mai la tinta
(`--color-viola`, `--color-grigio-10`). Conseguenza voluta: cambiare una
tonalità è una riga sola, e il dark theme (sotto) diventa quasi gratis.

**Ogni ruolo compare una volta sola.** Due concetti diversi non condividono un
token anche se oggi hanno lo stesso valore — altrimenti non si può ritoccarne
uno senza l'altro. Casi già separati per questo motivo:

| Ruolo | Token | Nota |
|---|---|---|
| Testo base | `--color-inchiostro` | le opacità `/40`..`/80` danno i toni tenui |
| Sfondo pagina | `--color-sfondo` | |
| Card / pannelli / righe / campi | `--color-superficie` | oggi bianco; nel dark NON bianco |
| Testo e veli su fondo primario | `--color-su-primario` | oggi bianco; header gradiente, bottoni pieni |
| Risposta esatta (`QuesitoCard`) | `--color-corretto` / `-sfondo` | |
| Risposta scelta sbagliata (`QuesitoCard`) | `--color-errato` / `-sfondo` | verde/rosso dell'**esito**, non dello stato |
| Errore di sistema / validazione (banner) | `--color-errore` / `-sfondo` | stesso rosso di `errato` oggi, ruolo distinto |
| Stato quiz `bozza` | `--color-stato-bozza` / `-sfondo` | viola: "in lavorazione, tuo" |
| Stato quiz `attivo` | `--color-stato-attivo` / `-sfondo` | verde **proprio**, non quello di `corretto` |
| Stato quiz `chiuso` | `--color-stato-chiuso` / `-sfondo` | ambra: chiuso ma riapribile |
| Stato quiz `archiviato` | `--color-stato-archiviato` / `-sfondo` | grigio: terminale |

I quattro stati del quiz hanno quattro tinte distinte apposta: nella lista
docente si riconosce lo stato dal colore del badge. **Il colore non è mai
l'unico segnale** — l'etichetta testuale resta sempre (accessibilità,
daltonismo).

**Eccezioni ammesse al "niente hard-coded", annotate nel codice:**
- sfondo del QR in `AccessoQuiz` → sempre `bg-white` reale: serve alla
  scansione, non deve seguire il tema;
- `--shadow-morbida` / `--shadow-bottone` incorporano il primario come `rgba`:
  è un'ombra, non un colore di contenuto. Da rivedere col dark theme.

**Colore per materia: non ancora.** Distinguere le materie a colpo d'occhio
(liste quesiti/quiz) è rimandato a quando c'è la superficie che ne beneficia
(pagina statistiche). Quando si farà: una funzione pura `coloreMateria(nome)`
che mappa su un set chiuso di 6-8 token, non tinte a mano sparse nei componenti.

### Dark theme — predisposto, non attivo

**Obiettivo dichiarato, soprattutto per le schermate studente** (telefoni in
aula, uso serale, OLED). Non implementato nell'MVP: il grosso del valore è
sulla pagina statistiche, che non esiste ancora. Rimandato lì.

Cosa è già pronto:
- token con nomi di ruolo, zero hex nei componenti (fatto);
- blocco `@media (prefers-color-scheme: dark)` **commentato** in `index.css`
  che elenca i soli token da ridefinire;
- la palette light è stata scelta verificando che le relazioni fra tinte
  (i quattro stati, esito giusto/sbagliato) reggano anche su fondo scuro.

Cosa manca (da fare quando si affronta): dare i valori scuri ai token, la QA
sistematica schermo per schermo, la gestione di `--shadow-*` e dei pochi
`bg-white` deliberati. Nessun componente andrà toccato: usano tutti nomi di
ruolo. Se a quel punto il dark non si vuole più, i token semantici restano
comunque il modo corretto di gestire i colori — non si è perso nulla.

## Internazionalizzazione

**Nessuna i18n prevista, deliberatamente.** Il progetto resta interamente in
italiano — non solo l'interfaccia, ma anche il modello dati e la
terminologia nel codice (`quesito`, `opzioni`, `quesitiRepository.js`, ecc.).
Non è un limite temporaneo da colmare più avanti con `react-i18next` o
simili: è la stessa scelta di terminologia già motivata sopra ("Quesito" non
"domanda", coerente con l'uso scolastico italiano/INVALSI), estesa a tutto
il progetto.

Motivazioni:

- **Pubblico e contesto fissi.** La piattaforma serve un istituto scolastico
  italiano, con SSO Google istituzionale e conformità pensata sul Garante
  Privacy italiano — non c'è un caso d'uso reale multi-lingua all'orizzonte.
- **Valore didattico del codice in italiano.** Se il codice viene mostrato
  agli studenti (è già capitato che lo chiedessero: "prof, come l'ha fatto
  questo sito?"), nomi e struttura in italiano sono più immediati da leggere
  per loro rispetto a un codebase con terminologia inglese e stringhe
  esternalizzate in file di traduzione.
- **I quesiti non sono testo di interfaccia.** Sono contenuti didattici
  creati dai docenti (o generati dall'IA a partire da appunti in italiano):
  tradurli cambierebbe il significato, altererebbe la correttezza delle
  opzioni, e non ha comunque senso farlo automaticamente. Un'eventuale i18n
  dell'interfaccia non risolverebbe comunque questo, quindi non vale il
  costo di introdurla solo per le label statiche.

Se in futuro dovesse emergere un bisogno reale (es. un istituto con studenti
non italofoni), va trattato come una decisione nuova da riprendere da capo,
non come "attivare" un'infrastruttura i18n lasciata pronta in previsione:
nessuna struttura di questo tipo va predisposta preventivamente nel codice.

## Versionamento dei quesiti

**Un quesito non si modifica mai in place: modificarlo crea sempre la
versione successiva.** L'id di un quesito è `baseId` + `-v` + numero di
versione, senza padding (es. `fgkskbf8jbwekfijasd-v0`, poi `-v1`, `-v2`, ...,
`-v10`...). Il campo `versione` (numero intero) è duplicato sul documento
stesso, non ricavato via parsing dell'id — è la fonte di verità per
ordinamento e confronto; il suffisso nell'id serve solo a leggibilità/debug e
a costruire l'id per concatenazione (`` `${baseId}-v${versione}` ``), non è
mai usato per ordinare o confrontare versioni.

Perché: `quiz.quesiti` contiene id di quesiti specifici (vedi
`isaquiz_ERD.md`), quindi un quiz già somministrato deve continuare a
mostrare esattamente il testo/opzioni visti dallo studente in quel momento,
per sempre. Un edit in place lo romperebbe silenziosamente — sia per i propri
quiz passati, sia per quelli di un collega che avesse preso lo stesso quesito
dalla banca condivisa.

**Chi può creare una nuova versione, e sotto quale `baseId`:**

- **Autore originale** (`quesito.autoreId === utenteCorrente.id`): la
  modifica crea la versione successiva sotto lo **stesso** `baseId`.
- **Non autore** (quesito preso dalla banca condivisa, `condivisa: true`):
  la modifica crea un **nuovo `baseId`**, con l'utente corrente come
  `autoreId` — di fatto un fork/copia propria. Non si tocca mai la lineage
  di un quesito altrui.

**Banca quesiti (elenco in `CreaQuiz`): mostra solo l'ultima versione per
`baseId`.** Le versioni precedenti restano su Firestore ma non compaiono
nella lista né sono ricercabili — sono raggiungibili solo per id esatto, da
un `quiz.quesiti` che le referenzia. `quesitiRepository.js` continua a dover
risolvere qualsiasi id di qualsiasi versione (serve a `QuizRisultati`), ma la
funzione di listing per la banca filtra/raggruppa per `baseId` tenendo solo
la `versione` massima. Alla scala attuale, filtro lato client dopo fetch
completo — niente indice composto Firestore per ora.

**Modificabile solo l'ultima versione**: coerente per definizione, dato che
"modificare" *è* creare la versione successiva a partire dall'ultima. Se un
vecchio quesito viene raggiunto da dentro un quiz passato, è sempre in sola
lettura (`QuizRisultati` resta "contenuto puro", nessuna azione di editing).

**Versioni orfane**: se un quesito viene modificato senza essere mai stato
usato in un quiz, la versione precedente resta su Firestore inutilizzata (non
in banca, non referenziata). Non è un bug, è spazio trascurabile alla scala
attuale; un eventuale cleanup è un job separato, non da gestire nel flusso di
`CreaQuiz`.

## Disattivazione dei quesiti

**Un quesito si può disattivare/riattivare, non si cancella.** Quando un
quesito non convince più o si rivela sbagliato, il docente lo disattiva: resta
su Firestore ma sparisce dalla banca (quindi non finisce in nuovi quiz).
Cancellarlo davvero richiederebbe un controllo d'uso (è referenziato da qualche
`quiz.quesiti`? da quesiti derivati?) — molto più costoso e fragile del
semplice flag.

- **Campo `QUESITO.attivo` (booleano), metadato.** Si scrive **in place**
  (come `condivisa`), NON crea una nuova versione — quello vale solo per il
  *contenuto* (testo/opzioni). `impostaAttivoQuesito(id, attivo)` opera sul
  documento passato (in banca è sempre l'ultima versione per `baseId`).
- **Regola di lettura: `attivo !== false`.** Un documento **senza** il campo —
  tutti i quesiti creati prima di questa modifica — è trattato come attivo.
  Mai `attivo === true` come filtro, escluderebbe silenziosamente lo storico.
  Il filtro è **client-side** apposta: un `where("attivo", "!=", false)` su
  Firestore salterebbe proprio i documenti senza il campo.
- **`getQuesito(id)` non filtra** per `attivo` (né per `versione`): risolve
  qualsiasi quesito per id esatto, così `QuizRisultati` mostra correttamente i
  quiz storici anche se un loro quesito è stato disattivato nel frattempo.
- **Ogni scrittura nuova** (`creaQuesito`, `salvaNuovaVersione`, `forkQuesito`)
  nasce `attivo: true` — esplicito, ma coerente col filtro anche se omesso.
  Creare una nuova versione di un quesito disattivato lo fa quindi ricomparire
  in banca (è il segnale "ci sto rilavorando").
- **In `CreaQuiz`**: la banca nasconde gli inattivi, con un toggle "Mostra
  inattivi" che li rende visibili (attenuati, badge, azione "Riattiva",
  niente "Aggiungi"). `getBancaDocente` prende un'opzione
  `{ includiInattivi }` (default `false`); CreaQuiz carica tutto una volta
  (`includiInattivi: true`) e filtra lato client col toggle.

## Generazione domande: interna vs esterna

**La distinzione è per pubblico, non per fase.** Non si tratta di "prima
prompt+import, poi in una fase successiva l'integrazione vera": i due
percorsi convivono fin dall'introduzione della funzionalità, rivolti a
platee diverse.

- **Generazione interna** (chiamata reale a un provider IA da
  `functions/aiProvider.js`): riservata all'autore del progetto per
  dogfooding/sviluppo. Non è pensata per i docenti pilota.
- **Generazione esterna** (prompt-template mostrato in UI + import di un
  JSON prodotto dal docente con un proprio strumento IA, es. ChatGPT/Gemini
  personale): il percorso per tutti gli altri docenti.

**Perché non integrare l'IA per tutti fin da subito.** Un'unica chiave API
condivisa significa che l'uso di un docente consuma la quota (gratuita) di
tutti gli altri — rischio concreto già con pochi docenti pilota, che userebbe
in poche ore l'intera quota giornaliera del free tier. Rimandare
l'integrazione "per tutti" a quando ci sarà un budget d'istituto reale (non
il credito personale dell'autore) evita il problema alla radice, senza
bloccare né lo sviluppo né l'uso personale nel frattempo.

**Vantaggio collaterale sul fronte GDPR.** Con la generazione esterna, la
piattaforma non chiama mai un'API IA per conto del docente: il docente usa
un proprio strumento personale, sotto i termini di quello strumento, e
incolla solo il risultato (testo JSON) in una pagina di import. Non c'è
quindi un trattamento dati che passa dalla piattaforma verso un provider IA
in questo percorso — il tema "fornitore IA come sub-responsabile del
trattamento" (`analisi-gdpr.md`, sez. 2 e 5) resta pertinente solo per la
generazione interna, cioè per l'unico utente (l'autore) che la usa. Il
warning su cosa non caricare (dati studenti) resta comunque da mostrare
prima del prompt copiabile, indipendentemente da chi genera.

**Sblocco della generazione interna: flag su `UTENTE`, non su `CONFIG`.**
Un campo booleano (es. `UTENTE.generazioneIA`), analogo a come `ruolo` è
oggi solo cache di comodo ma con fonte di verità nel controllo ad ogni
login: qui la verifica avviene ad ogni chiamata alla funzione, non solo
alla creazione dell'utente. Diversamente da `docentiAutorizzati` (lista
piatta in `CONFIG`, pensata per crescere con l'onboarding di più docenti),
questo flag è pensato per restare a una sola persona per tutto il pilot —
non serve quindi una lista dedicata in `CONFIG`, un campo sull'utente è
sufficiente e più semplice da leggere/scrivere.

**Guardia sul consumo, anche per l'unico utente abilitato.** Anche
generando solo tu, un errore (loop, doppio click, test ripetuti durante lo
sviluppo) può bruciare la quota giornaliera del free tier senza preavviso.
Un contatore semplice (es. `richiesteIAOggi` + data sull'utente, azzerato
al cambio giorno) blocca la chiamata oltre una soglia scelta a mano,
verificato lato Cloud Function prima di inoltrare la richiesta al
provider — non solo lato client, per non essere aggirabile.

**Punto di unione tra i due percorsi: la pagina di revisione/validazione.**
Entrambi i flussi producono lo stesso output intermedio (vedi sotto) e
confluiscono nella stessa pagina, sul modello di `QuizRisultati`
("contenuto puro"): riceve un array di quesiti-candidati come prop, senza
sapere se provengono da una chiamata API o da un paste+parsing. Chi la
monta (il bottone "Genera" per il percorso interno, il form di import per
quello esterno) si occupa solo di procurarle l'array nel formato giusto.
Nessun quesito finisce in banca (`creaQuesito`) finché non è stato accettato
esplicitamente riga per riga in questa pagina — stesso principio "human in
the loop" già scritto nel project charter e nell'analisi GDPR, applicato
anche alla provenienza della generazione, non solo alla validazione del
contenuto.

**Schema dell'array intermedio** (contratto tra "chi genera" e "chi
importa/valida", identico per i due percorsi):

```json
{
  "quesiti": [
    {
      "testo": "Qual è la capitale del Giappone?",
      "opzioni": ["Pechino", "Tokyo", "Seul", "Bangkok"],
      "indiceCorretto": 1,
      "spiegazione": "Tokyo è la capitale del Giappone dal 1868.",
      "argomento": "Geografia asiatica"
    }
  ]
}
```

Obbligatori: `testo`, `opzioni` (≥2 elementi, stringhe non vuote),
`indiceCorretto` (intero, `0 ≤ indiceCorretto < opzioni.length`),
**`spiegazione`** (stringa non vuota — coerente con l'uso in
`QuizRisultati` al riepilogo finale, vedi "Flusso quiz studente": un
quesito senza spiegazione romperebbe silenziosamente quella schermata).
Opzionale: `argomento` (impatta solo il tag visivo su `QuesitoCard` e le
future statistiche per-argomento, non il flusso di correzione). Assente
deliberatamente: `materia` — non viene mai richiesta al modello né lasciata
libera nell'output IA, la assegna la pagina di revisione dal corso
selezionato, con la stessa select vincolata già decisa per il form manuale
(vedi voce su `QUESITO.materia`).

Validazione in fase di import: ogni elemento è controllato singolarmente
contro le regole sopra; un elemento non valido non blocca gli altri —
resta segnalato ed editabile a mano nella pagina di revisione invece di
obbligare a rigenerare l'intero array.

**`QUESITO.fonte` prende quindi un significato concreto** (era lasciato
aperto in "Stati del quiz"): `"manuale"` per il form diretto,
`"ia-interna"` / `"ia-esterna"` per i due percorsi qui descritti — utile a
distinguerli in banca senza che cambi nient'altro nel modello dati.

**Possibile terza via, non implementata ora: chiave propria del docente.**
Alcuni docenti con competenze informatiche potrebbero preferire generazione
interna vera ma con una propria chiave API (costo, se presente, a loro
carico — non del progetto, non dell'istituto). Non implementata nel pilot:
aggiungerebbe superficie (campo chiave sul profilo, mai esposta in chiaro
dopo il salvataggio, validazione, gestione errori di chiave scaduta/senza
credito) per un pubblico verosimilmente ristretto. Annotata qui perché è
richiesta probabile, non ipotetica — se e quando arriva, si innesta senza
stravolgere il disegno attuale: la pagina di revisione resta identica,
cambia solo quale chiave usa `functions/aiProvider.js` per quell'utente
(quella del progetto, o quella personale se presente e valida). Vedi anche
voce corrispondente in "Non ancora deciso".

## Stati del quiz

**Enum `QUIZ.stato`: `bozza` → `attivo` ⇄ `chiuso` → (eventuale) `archiviato`.**

- **`bozza`**: modificabile liberamente (aggiungere/togliere quesiti, cambiare
  titolo/corso) e cancellabile per davvero (delete fisico) — non è mai
  esistito per nessuno studente, nessun problema di coerenza storica.
- **`attivo`**: il trigger è unico e coincide con la pubblicazione — il
  momento in cui viene generato il QR code. Non esiste uno stato intermedio
  "pubblicato ma non ancora somministrato": per il principio guida "pochi
  passaggi dal contenuto della lezione al quiz" non c'è un caso d'uso reale
  in cui un docente pubblica e aspetta prima di dare il via. Da questo
  momento il **contenuto è immutabile e permanente**: niente edit, niente
  delete fisico — coerente con il resto del progetto (nessuna riga storica si
  sovrascrive o si cancella; `corretta` su `RISPOSTA` scrivibile solo
  server-side). `attivo` = accetta risposte.
- **`chiuso`**: finita la somministrazione in classe, il docente chiude il
  quiz (`chiudiQuiz`): gli studenti non possono più **aprirlo**
  (`QuizStudente` blocca all'apertura). **Reversibile**: `riapriQuiz` riporta
  ad `attivo`, es. per i ritardatari. Contenuto immutabile come in `attivo`
  — l'unica cosa che cambia tra `attivo` e `chiuso` è se accetta risposte.
  Niente realtime: uno studente già dentro il quiz quando viene chiuso può
  finire; il blocco è all'apertura. Quando `risposteRepository`/functions
  saranno reali, il server rifiuterà le scritture su un quiz non `attivo`.
  Chiusura automatica a tempo: possibile in futuro (un `chiudeAlle`), non
  ancora.
- **`archiviato`** (eventuale, non necessario per l'MVP): non toglie il quiz
  dal database, lo toglie solo dalle liste attive del docente. Il riferimento
  resta intatto per `RISPOSTA` e `QuizRisultati`.

**Duplicazione, non modifica, per riusare un quiz attivo.** Per somministrare
lo stesso quiz a un'altra classe, o una variante leggermente diversa, si
duplica: nuovo documento `QUIZ` (nuovo id, `stato: bozza`), `corsoId` anche
diverso, `quesiti` copiato come array di riferimenti (si copiano gli id, non
i quesiti stessi). Da lì è un quiz indipendente, segue il proprio ciclo
bozza→attivo. Nessun legame dati con l'originale dopo la duplicazione — non
serve tracciare "duplicato da". Lo stesso vale per il fork di un quesito
(`forkQuesito`: nuovo `baseId`, autore = utente corrente): non si registra da
quale quesito derivi.

**`QUESITO.fonte`: significato ora fissato** (vedi "Generazione domande:
interna vs esterna"). Valori possibili: `"manuale"` (form diretto, valore
di default per tutte le scritture odierne da `CreaQuiz`), `"ia-interna"`
(generazione con provider IA integrato), `"ia-esterna"` (import da
prompt+JSON prodotto dal docente con un proprio strumento). Non usato per
la provenienza del fork (`forkQuesito` eredita `fonte` dal quesito
originale, non lo resetta a `"manuale"` — se un domani servisse distinguere
"fork di un manuale" da "fork di un IA", andrà rivalutato, non è il caso
d'uso principale oggi).

**Stato dell'implementazione**: `CreaQuiz.jsx`, dopo "Salva bozza", offre
"Pubblica e avvia il quiz" (conferma inline, data l'irreversibilità) →
`avviaQuiz` (`bozza → attivo`, a senso unico) → `components/AccessoQuiz.jsx`
mostra QR + link `/quiz/{id}`. `DocenteHome.jsx` (route `/docente`) elenca i
quiz del docente; per riga: bozza → pubblica / **modifica**
(`/docente/crea-quiz/:quizId` → `aggiornaQuizBozza`) / elimina (`eliminaQuiz`,
delete fisico); attivo/chiuso → **risultati** (`RisultatiDocente`, route
`/docente/quiz/:quizId/risultati`) / link-QR; attivo → **chiudi**
(`chiudiQuiz`); chiuso → **riapri** (`riapriQuiz`); attivo/chiuso → **duplica**
(`duplicaQuiz` → nuova bozza, si apre subito in modifica). `aggiornaQuizBozza`,
`eliminaQuiz` sono consentite SOLO finché `stato: bozza`. In modifica, i
quesiti del quiz sono "aggiornati" all'ultima versione del loro `baseId` (una
bozza si compone sempre dalla banca corrente). Lo studente apre solo quiz
`attivo` (`QuizStudente` blocca `bozza`/`chiuso`/`archiviato`). Non ancora
fatti: `archiviaQuiz`, chiusura automatica a tempo, i risultati in tempo reale
(onSnapshot).


## Codice di accesso ai quiz

**Lo studente entra in un quiz digitando un codice breve** (dalla home
`/studente` → "Partecipa a un quiz"), in alternativa a scansionare il QR o
aprire il link lungo — è la via comoda per l'uso in classe.

- **Collezione dedicata `codici_accesso`, non un campo su `quiz`.** L'id del
  documento È il codice, quindi il lookup codice → quizId è un `getDoc`
  diretto (nessuna query, nessun indice), e l'unicità è garantita dall'id.
  Documento: `{ quizId, creato }`. Da non confondere con `CORSO.codiceAccesso`,
  che serve a iscriversi a un CORSO per l'anno — questo è per una singola
  somministrazione.
- **Alfabeto Crockford Base32** (`0-9 A-Z` senza `I L O U`, ambigui a occhio),
  maiuscolo, generato con `crypto.getRandomValues` (`byte % 32`, senza bias).
  `normalizzaCodice`: maiuscolo, "clemenza" di Crockford (`I/L → 1`, `O → 0`
  per perdonare chi ricopia male una cifra), poi **allowlist** — si tengono
  SOLO i caratteri dell'alfabeto, tutto il resto (spazi, punteggiatura, `/`,
  `..`, `<>`, emoji…) sparisce. Così l'output è sempre un id documento
  Firestore valido e innocuo. Non è che oggi ci sia un rischio di injection
  (un `getDoc(doc(...))` è un lookup per chiave, non un query language; React
  escapa l'output), ma è difesa in profondità e dà un pulito "codice non
  valido" invece di eccezioni. `getQuizIdDaCodice` non lancia mai per input
  malformato (id vuoto o troppo lungo → `null`); gli errori di rete invece
  propagano.
- **La lunghezza (oggi 6) è un parametro di sola generazione**
  (`LUNGHEZZA_GENERAZIONE` in `codiciAccessoRepository.js`), in un unico
  punto. Tutto il resto è length-agnostic: `normalizzaCodice` non tronca,
  l'input in `/studente` non ha controlli di lunghezza (basta non vuoto), un
  codice è "valido" se corrisponde a un documento. Cambiare il numero non
  richiede altre modifiche e non invalida i codici già emessi.
- **Il codice nasce con la pubblicazione** (`avviaQuiz`) ed è **stabile per
  tutta la vita del quiz**: `chiudi`/`riapri` non lo rigenerano, così il
  docente riapre per i ritardatari *con lo stesso codice*. Mai riusato per un
  altro quiz. `generaCodiceQuiz` è idempotente (self-heal per quiz attivi
  senza codice). `archiviaQuiz`, quando ci sarà, potrà liberarlo.
- **Generazione lato server (Fase 2).** `data/codiciAccessoRepository.js`
  `generaCodiceQuiz` invoca la callable `functions/generaCodiceAccesso.js`:
  verifica che il chiamante sia l'autore del quiz e che il quiz sia `attivo`,
  poi genera il codice in una `runTransaction` (query di esistenza + candidato +
  `set`) con retry — idempotente e **senza la micro-race** del vecchio
  check-then-create client-side. Il client non scrive più su `codici_accesso`
  (rules: `write: if false`); la lettura è aperta a chi è autenticato (è solo un
  puntatore; il contenuto del quiz resta protetto da `QuizStudente`, che apre
  solo lo stato `attivo`). L'alfabeto Crockford e la lunghezza sono duplicati
  nella function (functions/ non importa da data/) — sincronizzati a mano.


## Modello dati: le risposte (granulari, non aggregate)

**Una `RISPOSTA` = un documento**, id deterministico
`quizId_studenteId_quesitoId` nella collezione top-level `risposte`.
Rispondere di nuovo allo stesso quesito sovrascrive, non duplica. Valutata e
scartata l'alternativa "un documento per `(quizId, studenteId)` con dentro una
mappa di tutte le risposte".

**Perché granulare, adesso:**

- **Security rules (Fase 2 — fatte).** `corretta` non è scrivibile dal client:
  con un documento per risposta la regola è banale (`create` senza il campo;
  `update` solo su `rispostaData`/`timestamp` via `affectedKeys().hasOnly(...)`).
  Con l'aggregato servirebbe validare che un `update` abbia aggiunto *solo* una
  chiave nella mappa senza toccare i `corretta` annidati — in Firestore rules è
  complicato e fragile. (Per far tornare i conti con `hasOnly`, `saveAnswer` usa
  `merge`: un re-invio non rimuove `corretta` scritto dal server.)
- **`calcolaPunteggio.js` come trigger (Fase 2 — fatto).** Scatta su
  `onDocumentWritten` di una risposta, calcola `corretta`, riscrive quel campo
  (guardia anti-loop). Con l'aggregato dovrebbe fare il diff before/after dello
  snapshot per capire cosa è cambiato.
- **`RISPOSTA` è un'entità di dominio** (vedi "Terminologia"): un documento per
  RISPOSTA lo esprime direttamente.
- **Query longitudinali** (il caso d'uso centrale: "tutte le risposte di uno
  studente nel tempo", "tutte le risposte al quesito X tra somministrazioni"):
  le righe granulari le supportano; l'aggregato le rende scansioni di mappe.
- Le query attuali sono su singolo campo o a più uguaglianze → **nessun indice
  composto** richiesto.

**Lo svantaggio noto** (più letture: la vista risultati del docente legge N
righe per studente invece di 1) non morde alla scala pilota. Se un domani pesa
davvero: **non** si collassa la fonte di verità, si aggiunge un documento
*riassunto* (`punteggi/{quizId_studenteId}`: totale + conteggi per argomento)
scritto da `calcolaPunteggio.js` a fine quiz — pattern materialized view,
granulare resta il write model.

**Se un domani si passasse a un DB relazionale**: il modello granulare è già la
forma di una tabella normalizzata `risposta(id, quiz_id, studente_id,
quesito_id, risposta_data, corretta, timestamp)` con
`UNIQUE(quiz_id, studente_id, quesito_id)` — migrazione = copia 1:1. L'aggregato
invece diventerebbe una colonna JSON (si perdono `GROUP BY quesito_id`,
`AVG(corretta)`, gli indici su singola risposta) o andrebbe spacchettato in
righe durante la migrazione. Le JOIN che in Firestore si evitano
(`risposta → quesito / quiz / utente`) in SQL si vogliono, e le righe granulari
le danno gratis.

## Non ancora deciso

- Strategia branch Git (`main` / `dev` / `rel`) — da chiarire cosa rappresenta
  `rel` prima di iniziare a usarlo attivamente.
- Libreria di grafici per le statistiche (candidato: `recharts`, già nello stack).

- **Chi crea `CORSO` e assegna `DOCENTE_CORSO`: self-service o admin-driven?**
  L'idea di partenza è un modello decentralizzato, sul modello di Google
  Classroom (il docente crea il proprio corso, senza intermediazione della
  segreteria/admin) — coerente con "pochi passaggi dal contenuto della
  lezione al quiz" e con l'assenza di un flusso di approvazione anche per il
  ruolo admin (vedi "Amministratore: cruscotto minimale"). Da notare però che
  in Classroom i corsi non sono condivisi tra docenti nello stesso modo in
  cui `isaquiz` prevede una banca quesiti condivisa (Fase 4): il parallelo
  regge per la creazione del corso, non necessariamente per tutto il resto.
  Se self-service: `materia` resta testo libero fin dall'inizio, nessuna
  lista "ufficiale" — coerente con la combobox editabile scelta per
  `QUESITO.materia`. Se invece la creazione dei corsi finisse per essere
  admin-driven (assegnazione cattedre), servirebbe rivalutare se anche
  `materia` debba attingere a una lista d'istituto per evitare drift di
  denominazione (es. "Informatica" vs "informatica" vs "Lab. Informatica").
  Decisione rimandata: probabile da affrontare insieme alla Fase 2 (login
  vero + `docentiAutorizzati`), quando si definisce comunque l'onboarding
  del docente.

- **Chiave IA personale del docente, come terza via oltre a interna/esterna.**
  Richiesta probabile da colleghi con background informatico, non ipotetica.
  Rimandata: vedi nota in "Generazione domande: interna vs esterna" per il
  dettaglio di cosa comporterebbe implementarla (campo chiave sul profilo,
  mai in chiaro dopo il salvataggio, validazione, gestione errori) e perché
  non si innesta comunque in modo distruttivo sul disegno attuale.
