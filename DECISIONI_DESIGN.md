# Decisioni di design — isaquiz

Sintesi delle scelte UX e architetturali prese durante la progettazione, con la
motivazione. Non è un verbale della discussione: solo le decisioni finali,
utile a chi riprende il progetto (anche lo stesso autore, fra qualche settimana)
senza dover ricostruire il ragionamento da capo.

## Sviluppo

**Mock auth prima, login vero solo per i ragazzi.** Si sviluppa con un'autenticazione
fittizia (`data/mockAuth.js`) finché tutto il flusso non è stabile. Firebase Auth
con Google si collega solo alla fine (Fase 2 del piano di sviluppo). Nessuno
studente deve usare la piattaforma prima che il login vero sia attivo — è una
scelta didattica, non solo tecnica: i ragazzi vedono solo il prodotto finito.

## Flusso quiz studente

- **Solo avanti, niente tasto indietro.** Coerente con "verifica immediata", non
  un esame formale; evita che tornare indietro diventi un modo per "correggersi".
- **Ritmo libero per studente, non sincronizzato dal docente.** Niente
  infrastruttura realtime tipo Kahoot — chi finisce prima non aspetta gli altri.
- **Feedback immediato solo ✓/✗, spiegazione completa differita al riepilogo
  finale.** Evita che uno studente veloce dica ad alta voce la spiegazione a un
  compagno ancora sulla stessa domanda.
- **Durante il quiz non si mostra nemmeno QUALE fosse la risposta corretta**
  (non solo la spiegazione) — non è un'incoerenza rispetto al caso "risposta
  giusta" (dove lo studente la conosce già, è quella che ha scelto): è
  l'informazione più facile da suggerire a voce a un compagno, quindi la prima
  da proteggere. La prop che rivela la risposta corretta su `DomandaCard`
  esiste solo nel contesto `QuizRisultati`, mai durante lo svolgimento.
- **Il calcolo di giusto/sbagliato resta lato client (per ora), rischio noto e
  accettato.** La UI non mostra mai la risposta corretta durante il quiz (vedi
  sopra), ma il dato `indiceCorretto` arriva comunque al client insieme alla
  domanda — chi ispeziona il codice o lo stato React vede in anticipo tutte le
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

- **Componente "contenuto puro"**: non sa se viene mostrato come pagina intera,
  dentro un modale, o inline in un pannello. Chi lo monta decide il contenitore.
- **Tag di argomento sempre visibile su ogni domanda**, anche in un quiz misto
  (es. un ripasso con più argomenti) — così il quiz è identico ovunque lo apri,
  nessuna versione "filtrata" a seconda del punto di ingresso.

## Statistiche studente

- **Aggregazione per argomento**, non per singolo quiz — più utile per capire
  dove lo studente è debole. Un quiz misto contribuisce a più argomenti: è
  corretto, non un errore di conteggio.
- **Drill-down come accordion** (non nuova route): click su un argomento espande
  la lista dei quiz che lo contengono, senza perdere il contesto dei filtri.
- **Punteggio mostrato nella lista è quello CONTESTUALE** ("3/4 su questo
  argomento"), non il totale del quiz — risponde insieme a "quante domande di
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

## Non ancora deciso

- Strategia branch Git (`main` / `dev` / `rel`) — da chiarire cosa rappresenta
  `rel` prima di iniziare a usarlo attivamente.
- Libreria di grafici per le statistiche (candidato: `recharts`, già nello stack).
