# Diagramma ERD — isaquiz

*Ultimo aggiornamento: 27 agosto 2026.*

Diagramma concettuale (mermaid) dello schema dati, versione con corsi per
materia, classi come unità amministrativa, e utente unico multi-ruolo.
Per il ragionamento dietro ogni scelta, vedi `DECISIONI_DESIGN.md`.

```mermaid
erDiagram
    UTENTE {
        string id
        string email
        string nome
        string cognome
        string ruolo
        string classeId
    }

    CLASSE {
        string id
        string nome
        string annoScolastico
    }

    CORSO {
        string id
        string classeId
        string materia
        string annoScolastico
        string codiceAccesso
    }

    DOCENTE_CORSO {
        string docenteId
        string corsoId
        string ruolo
    }

    DOCENTE_CLASSE {
        string docenteId
        string classeId
        string ruolo
    }

    ISCRIZIONE_CLASSE {
        string studenteId
        string classeId
        string annoScolastico
    }

    ISCRIZIONE_CORSO {
        string studenteId
        string corsoId
        string annoScolastico
    }

    CONFIG {
        string annoScolasticoCorrente
        string docentiAutorizzati
    }

    QUESITO {
        string id
        string autoreId
        string testo
        string opzioni
        number indiceCorretto
        string spiegazione
        string materia
        string argomento
        string difficolta
        boolean condivisa
        string fonte
    }

    QUIZ {
        string id
        string corsoId
        string titolo
        string stato
        string quesiti
    }

    RISPOSTA {
        string id
        string quizId
        string studenteId
        string quesitoId
        string rispostaData
        boolean corretta
        string timestamp
    }

    BADGE {
        string id
        string studenteId
        string tipo
        string motivazione
        string assegnato
    }

    CLASSE ||--o{ CORSO : "contiene (per materia/anno)"
    CLASSE ||--o{ ISCRIZIONE_CLASSE : "ha iscritti"
    CLASSE ||--o{ DOCENTE_CLASSE : "ha coordinatori"
    UTENTE ||--o{ ISCRIZIONE_CLASSE : "si iscrive come studente"
    UTENTE ||--o{ DOCENTE_CLASSE : "coordina come docente"
    UTENTE ||--o{ ISCRIZIONE_CORSO : "si iscrive come studente"
    UTENTE ||--o{ DOCENTE_CORSO : "insegna come titolare/assistente"
    CORSO ||--o{ ISCRIZIONE_CORSO : "ha iscritti"
    CORSO ||--o{ DOCENTE_CORSO : "ha docenti"
    CORSO ||--o{ QUIZ : "contiene"
    UTENTE ||--o{ QUESITO : "autore di"
    QUIZ ||--o{ RISPOSTA : "raccoglie"
    UTENTE ||--o{ RISPOSTA : "risponde come studente"
    QUESITO ||--o{ RISPOSTA : "risposta a"
    UTENTE ||--o{ BADGE : "riceve"
```

## Note di lettura

- **`UTENTE` è una tabella sola** per studenti, docenti e amministratore. Il
  campo `ruolo` è solo la cache per la dashboard di default al login — la
  fonte di verità per un contesto specifico (un corso, una classe) è sempre
  la riga di collegamento (`ISCRIZIONE_CORSO`, `DOCENTE_CORSO`,
  `DOCENTE_CLASSE`), mai questo campo.
- **`CORSO`, non `CLASSE`, contiene i quiz.** `CLASSE` è l'unità amministrativa
  usata dal coordinatore per la vista d'insieme — schema presente da subito,
  vista aggregata cross-materia rimandata a dopo la DPIA (Fase 4/5).
- **`DOCENTE_CORSO.ruolo`** distingue titolare da assistente sullo stesso
  corso: stessa persona può essere titolare su un corso e assistente su un
  altro, sono righe indipendenti.
- **Nessuna riga viene mai sovrascritta al cambio di anno scolastico.** Nuovo
  anno, nuova promozione, nuovo ruolo (es. ex studente che torna come
  docente): si aggiungono righe, non si modificano quelle esistenti.
  `CONFIG.annoScolasticoCorrente` è il singolo valore che rende i codici delle
  annate precedenti non più validi.
- **`QUESITO.opzioni` e `QUIZ.quesiti` sono array**, non stringhe singole —
  mermaid non ha un tipo array nativo per gli ER diagram, quindi qui compaiono
  come `string` per limite di notazione, non perché lo siano davvero.
  `opzioni` è l'elenco delle alternative di scelta multipla; `indiceCorretto`
  è la posizione (0-based) di quella giusta dentro `opzioni`. Vedi
  `DECISIONI_DESIGN.md`, "Terminologia", sul perché non si chiamano "risposte".
