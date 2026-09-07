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

**Mock auth prima, login vero solo per i ragazzi.** Si sviluppa con un'autenticazione
fittizia (`data/mockAuth.js`) finché tutto il flusso non è stabile. Firebase Auth
con Google si collega solo alla fine (Fase 2 del piano di sviluppo). Nessuno
studente deve usare la piattaforma prima che il login vero sia attivo — è una
scelta didattica, non solo tecnica: i ragazzi vedono solo il prodotto finito.

**Emulatore Firestore, non un progetto Firebase reale, finché non serve.** Lo
sviluppo gira sull'emulatore (`firebase-tools`, progetto `demo-isaquiz` — il
prefisso `demo-` fa sì che l'emulatore non chieda credenziali né contatti
servizi reali). `scripts/seed.mjs` (usa `firebase-admin`) popola dati di prova
in modo idempotente. Il tooling vive in un `package.json` alla radice
(`npm run emu`, `npm run seed`); l'SDK Firebase client è dipendenza di
`data/package.json`, non di `ui/`, perché solo `data/` parla con Firestore.
`firestore.rules` è un placeholder aperto (`allow read, write: if true`): valido
SOLO in locale, le regole vere legate a `request.auth` arrivano in Fase 2 —
niente deploy su un progetto reale con quel blocco attivo.

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
- **Il calcolo di giusto/sbagliato resta lato client (per ora), rischio noto e
  accettato.** La UI non mostra mai la risposta corretta durante il quiz (vedi
  sopra), ma il dato `indiceCorretto` arriva comunque al client insieme al
  quesito — chi ispeziona il codice o lo stato React vede in anticipo tutte le
  risposte corrette del quiz. La correzione "vera" (validare ogni risposta
  server-side, rivelare l'esito solo dopo, tramite `calcolaPunteggio.js`
  triggerato dalla scrittura Firestore, già previsto per il campo `corretta`
  su `risposte`) è stata scartata per ora: moltiplica le invocazioni Cloud
  Function per il numero di risposte, un costo che ha senso affrontare solo se
  la piattaforma prende piede davvero. Scelta esplicita, non dimenticanza — da
  rivedere se il problema si presenta concretamente, non preventivamente. Chi
  trova questa falla sa già usare gli strumenti sviluppatore meglio della
  media: accettabile in un contesto didattico di informatica.

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
  soggetta a DPIA. Aggiornamento manuale; il "tempo reale" (onSnapshot) è un
  possibile passo successivo. Punteggio calcolato lato client (`opzioneScelta`
  vs `indiceCorretto`), `corretta` su `RISPOSTA` resta server-only.

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

**`QUESITO.fonte`: campo presente nello schema, significato non ancora
fissato.** Oggi ogni scrittura da `CreaQuiz` (`creaQuesito`,
`salvaNuovaVersione`, `forkQuesito`) lo lascia a `"manuale"`. Non va usato per
la provenienza del fork né per altro finché non c'è una decisione esplicita —
quando la Fase 3 introdurrà i quesiti generati dall'IA servirà probabilmente un
valore tipo `"ia"`, ma è quella la sede per deciderlo.

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
fatti: `archiviaQuiz`, chiusura automatica a tempo, un codice breve digitabile
in alternativa al link, i risultati in tempo reale (onSnapshot).


## Modello dati: le risposte (granulari, non aggregate)

**Una `RISPOSTA` = un documento**, id deterministico
`quizId_studenteId_quesitoId` nella collezione top-level `risposte`.
Rispondere di nuovo allo stesso quesito sovrascrive, non duplica. Valutata e
scartata l'alternativa "un documento per `(quizId, studenteId)` con dentro una
mappa di tutte le risposte".

**Perché granulare, adesso:**

- **Security rules (Fase 2).** `corretta` non deve mai essere scrivibile dal
  client (regola fissa, vedi "Flusso quiz studente"). Con un documento per
  risposta la regola è banale: l'id codifica la proprietà, e si nega la
  scrittura del campo `corretta`. Con l'aggregato servirebbe validare che un
  `update` abbia aggiunto *solo* una chiave nella mappa senza toccare i
  `corretta` annidati nelle chiavi esistenti — in Firestore rules è complicato
  e fragile.
- **`calcolaPunteggio.js` come trigger.** Scatta sulla `create` di una
  risposta, calcola `corretta`, riscrive quel campo. Pulito. Con l'aggregato
  dovrebbe fare il diff before/after dello snapshot per capire cosa è
  cambiato.
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

