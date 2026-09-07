# isaquiz — Project Charter

*Titolo originale: "QuizDidattica - Piattaforma semplice per la verifica immediata dell'apprendimento". Il progetto è stato poi rinominato in isaquiz.*

## Idea del progetto

Piattaforma web estremamente semplice che permette ai docenti di creare e somministrare brevi quiz agli studenti, in particolare al termine di una lezione o di un'attività didattica. Obiettivo principale: ridurre al minimo la complessità tecnologica — anche un docente con competenze informatiche limitate deve poter preparare e avviare un quiz in pochi minuti.

I risultati dei singoli quiz diventano nel tempo uno strumento utile sia per il docente (individuare difficoltà e progressi), sia per lo studente (rappresentazione del proprio percorso di apprendimento).

## Obiettivi

- scegliere domande già disponibili in una banca dati condivisa;
- creare manualmente nuove domande;
- generare automaticamente domande tramite IA a partire da testo, appunti o argomenti di lezione;
- conservare le proprie domande e, eventualmente, condividerle con altri docenti;
- comporre rapidamente un quiz (5, 10, 20 domande);
- somministrarlo immediatamente alla classe;
- raccogliere automaticamente le risposte;
- analizzare risultati individuali e complessivi;
- monitorare nel tempo progressi, partecipazione e continuità;
- valorizzare il percorso di apprendimento con gamification e riconoscimenti.

## Esperienza dello studente

Accesso il più immediato possibile: il docente proietta un QR code (LIM/lavagna digitale) → lo studente inquadra il QR → apre il quiz → accede con l'account Google istituzionale → risponde → invia.

Randomizzazione di domande/risposte o domande differenti per studente: rimandate a fasi successive (anti-copiatura).

## Esperienza del docente

Principio fondamentale: **"Pochi passaggi dal contenuto della lezione al quiz."**

Flusso tipo: Nuovo quiz → inserisci argomento/testo → genera domande → scegli le domande → avvia quiz. Nessuna configurazione obbligatoria prima dell'uso.

## Banca dati condivisa delle domande

Domande organizzate per materia, argomento, sottoargomento, classe/livello, difficoltà, docente autore. Ogni docente ha un'area personale; le domande possono essere condivise con altri docenti, costruendo progressivamente una banca dati d'istituto.

## Intelligenza Artificiale

Il docente incolla appunti/testo/argomenti; il sistema propone domande e risposte. Il docente resta sempre responsabile della selezione finale (accetta/modifica/elimina prima della pubblicazione). L'IA è supporto alla preparazione, non sostituto del giudizio del docente.

## Analisi dei risultati

- **Singolo studente**: quali domande comprese, quali difficili.
- **Singolo quiz**: domande con percentuale di errore elevata.
- **Classe**: argomenti assimilati vs. da riprendere, nel tempo.
- **Periodo scolastico**: partecipazione, comprensione, evoluzione.

Obiettivo principale: feedback formativo, non necessariamente un voto per ogni quiz.

## Gamification e sistema di badge

Badge legati a partecipazione, continuità, progressi, obiettivi didattici — non solo a risposte corrette o risultati migliori. Anche impegno, costanza, miglioramento personale. Evitare di trasformare l'attività in competizione tra studenti.

## Autenticazione e accesso

Autenticazione tramite account Google istituzionale (SSO) — nessuna nuova credenziale da creare/ricordare. Da valutare con attenzione: autorizzazioni, trattamento dati personali, tempi di conservazione, conformità normativa (vedi `analisi-gdpr.md`).

## Ipotesi tecnologica iniziale

- interfaccia web leggera e responsive;
- autenticazione Google istituzionale;
- sistema per gestione domande, quiz, risultati, progressi;
- servizi dedicati a logica applicativa e autorizzazioni;
- integrazione con servizio IA per generazione assistita domande.

Scelte tecnologiche definitive dopo validazione dell'idea, evitando dipendenze che complichino un'evoluzione/migrazione futura.

## MVP — Prima versione sperimentale

**Docente**: accedere con account istituzionale, creare domande, generare domande IA, recuperare domande precedenti, selezionare 5-20 domande, creare un quiz, visualizzare il QR code, vedere risultati e statistiche essenziali.

**Studente**: aprire il quiz tramite QR code, autenticarsi, rispondere, inviare le risposte, visualizzare un semplice feedback.

Tutto ciò che non è indispensabile a questo flusso è rimandato a versioni successive (badge e gamification avanzata inclusi).

## Criteri di successo della sperimentazione

Domanda guida: non "quante funzionalità possiede la piattaforma?" ma **"Un docente riesce a creare e somministrare un quiz utile alla classe in pochi minuti, senza bisogno di formazione tecnica?"**

- gli studenti partecipano con continuità?
- il feedback ottenuto è utile al docente?
- i risultati permettono di individuare rapidamente argomenti non compresi?
- l'utilizzo frequente dei quiz viene percepito come utile dagli studenti?
- gli elementi di gamification aumentano la partecipazione senza generare competizione negativa?

## Possibile sperimentazione — fasi

1. **Prototipo** — funzionalità essenziali.
2. **Test** — piccolo gruppo di docenti disponibili e alcune classi.
3. **Feedback** — osservazioni su semplicità d'uso, utilità didattica, partecipazione.
4. **Evoluzione** — badge, gamification, statistiche più evolute, personalizzazione.
5. **Valutazione** — presentazione alla dirigenza, decisione su prosecuzione.

## Visione

Trasformare il quiz da attività preparata con anticipo a strumento quotidiano: negli ultimi cinque minuti di lezione, il docente decide "vediamo subito se questo argomento è stato capito", e ottiene un feedback immediato. Nel tempo, i quiz diventano parte di un percorso più ampio di osservazione dei progressi.

Tre elementi da unire: **semplicità** per il docente, **immediatezza** per lo studente, **continuità** nel percorso di apprendimento.
