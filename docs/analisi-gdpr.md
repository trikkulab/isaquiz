# isaquiz — Analisi preliminare GDPR e protezione dei dati

*Documento di lavoro a supporto del Project Charter. Analisi preliminare, non un parere legale definitivo — richiede comunque il coinvolgimento del RPD (Responsabile della Protezione dei Dati) dell'istituto. Aggiornata tenendo conto del vademecum "La scuola a prova di privacy" del Garante Privacy (novembre 2025).*

## 1. Perché isaquiz non è "come il registro elettronico"

Stesso perimetro istituzionale del registro elettronico (dati di studenti, in gran parte minori, per finalità didattiche), ma tre differenze rilevanti:

- **Generazione di contenuti tramite IA** a partire da testi/appunti del docente — trattamento non previsto dal registro elettronico.
- **Banca dati condivisa** fra più docenti (e potenzialmente più istituti in futuro).
- **Fornitore di servizio nuovo** (la piattaforma stessa) che agisce da responsabile del trattamento, con proprio contratto, misure di sicurezza, ed eventuale tema di trasferimento internazionale dei dati se usa servizi IA extra-UE.

## 2. Ruoli e responsabilità

| Soggetto | Ruolo GDPR | Note |
|---|---|---|
| Istituto scolastico (dirigente) | Titolare del trattamento | Decide finalità e mezzi; autorizza formalmente l'adozione. |
| Sviluppatore/fornitore della piattaforma | Responsabile del trattamento (art. 28) | Serve contratto di nomina, istruzioni scritte, misure di sicurezza. |
| Fornitore IA (generazione domande) | Sub-responsabile | Se extra-UE, valutare trasferimento (v. sez. 5). |
| Docenti | Soggetti autorizzati | Formati su uso corretto di IA e banca dati condivisa. |
| Studenti/famiglie (minori) | Interessati | Diritti artt. 15-22; per under 14 consenso dai genitori quando richiesto. |

Se la banca dati fosse condivisa tra più istituti autonomi: tema di **contitolarità** (art. 26) da regolare con accordo dedicato — non da rimandare a fasi avanzate, cambia l'architettura di consensi e informative.

## 3. Basi giuridiche

Uso didattico ordinario (creazione quiz, raccolta risposte, statistiche di classe): **art. 6.1.e GDPR** (interesse pubblico), stessa base del registro elettronico — non serve consenso specifico degli studenti.

Casi che richiedono attenzione separata:

- **Gamification/badge pubblici**: se comportano confronto tra studenti oltre la funzione valutativa ordinaria, documentare esplicitamente in informativa + opzione di disattivazione.
- **Condivisione domande tra docenti/istituti**: riguarda il docente come autore, va comunque disciplinata (proprietà contenuto, rimozione).
- **Usi non didattici** (ricerca, miglioramento prodotto, addestramento modelli IA): NON possono appoggiarsi all'interesse pubblico della scuola — richiedono base separata, tipicamente incompatibile con dati di minori senza consenso esplicito. Da escludere esplicitamente nel contratto col fornitore.

## 4. Categorie di dati trattati

| Categoria | Esempio | Attenzione |
|---|---|---|
| Identificativi | Nome, cognome, classe, email istituzionale Google | Standard |
| Autenticazione | Account Google istituzionale (SSO) | Basso, se si riusa SSO senza salvare password |
| Prestazioni scolastiche | Risposte, punteggi, tempi, badge | Alto — riflette andamento scolastico nel tempo |
| Contenuti IA | Appunti/testi caricati dai docenti | Medio — verificare assenza di dati di terzi |
| Metadati utilizzo | Log accesso, IP, timestamp | Medio — conservare il minimo necessario |

Nessuna categoria particolare (art. 9) nell'impianto attuale — deve restare così. Un uso futuro per BES/DSA o dati sanitari richiederebbe valutazione ad hoc.

## 5. Intelligenza Artificiale — il punto più delicato

Dal vademecum 2025 (allineato alle linee guida MIM-IA 2025):

- Divieto di riconoscimento delle emozioni — non pertinente ora, da tenere presente per usi futuri.
- Rigore nella valutazione di piattaforme esterne, specialmente cloud extra-UE.
- Incoraggiamento a dati sintetici dove possibile — valutare se anonimizzare gli appunti prima dell'invio al servizio IA quando contengono riferimenti a studenti specifici.

Scelte tecniche concrete:

- Preferire fornitore IA con infrastruttura UE, o SCC valide per trasferimento extra-UE.
- Non inviare dati personali di studenti insieme al testo della lezione — vincolante a livello di interfaccia (avviso al docente prima dell'invio).
- Documentare "human in the loop": IA come supporto, decisione finale sempre del docente.

## 6. Necessità di una DPIA

Probabilmente necessaria (non solo consigliata), per la combinazione di:

- trattamento sistematico e su larga scala di dati di minori;
- uso di tecnologie innovative (generazione IA);
- costruzione di profili di andamento nel tempo (progressi, partecipazione, badge).

Da avviare già in **Fase 1 (Prototipo)**, non rimandata a Fase 4 — più semplice ed economico correggere l'architettura dati mentre il sistema è ancora piccolo.

## 7. Conservazione e cancellazione dei dati

Da definire esplicitamente, in coerenza con i tempi già usati per il registro elettronico:

- dati del singolo quiz: legata all'anno scolastico, possibile aggregazione anonima per statistiche di lungo periodo;
- profilo progressi/badge: da valutare se terminare con l'anno scolastico, il ciclo di studi, o richiedere decisione esplicita della famiglia;
- contenuti IA non pubblicati in un quiz: cancellazione automatica dopo periodo breve (30-90 giorni).

## 8. Sicurezza e minimizzazione

- Autenticazione SSO Google istituzionale (riduce rischio vs. credenziali dedicate).
- Cifratura dati in transito e a riposo (risultati quiz, contenuti IA).
- Controllo accessi granulare: docente vede solo la propria classe, salvo ruoli specifici.
- Log degli accessi ai dati sensibili (risultati, badge), come già richiesto per il registro elettronico.
- Minimizzazione nella banca dati condivisa: nessun riferimento a studenti specifici nelle domande condivise.

## 9. Diritti degli interessati

Artt. 15-22 GDPR (accesso, rettifica, cancellazione, limitazione, portabilità, opposizione). Prevedere fin da subito:

- modo per un genitore/studente maggiorenne di richiedere esportazione/cancellazione dei dati storici (canale: segreteria scolastica, come per il registro elettronico);
- possibilità per il docente di correggere/eliminare un risultato errato;
- chiarezza su cosa succede ai dati di uno studente che cambia scuola o classe.

## 10. Integrazione con le dichiarazioni esistenti della scuola

- L'informativa privacy d'istituto va aggiornata con una sezione dedicata a isaquiz (finalità, dati trattati, uso IA, tempi di conservazione, fornitore esterno).
- Il registro dei trattamenti (art. 30) va integrato con una nuova voce.
- Anche con Google Workspace for Education già in uso, isaquiz — se sviluppata da terzi — richiede un contratto separato con quel fornitore, pur passando l'autenticazione da Google.

## 11. Checklist prima della sperimentazione (Fase 2)

- Coinvolgere il RPD prima dell'avvio del test, non dopo.
- Redigere (o richiedere al fornitore) una DPIA preliminare, anche semplificata.
- Formalizzare il rapporto con lo sviluppatore come responsabile del trattamento (art. 28), nomina scritta.
- Verificare localizzazione e garanzie contrattuali del servizio IA.
- Aggiornare l'informativa privacy d'istituto con sezione specifica su isaquiz.
- Definire tempi di conservazione espliciti per risultati, badge, bozze IA.
- Avviso operativo per i docenti su cosa NON caricare nel generatore IA.
- Documentare i criteri della gamification, per evitare comparazione negativa tra studenti.

## 12. Conclusione

Il rischio principale non è "se si può fare", ma "come viene configurato": scelta del fornitore IA, tempi di conservazione dei profili di progresso, aggiornamento dell'informativa — le tre decisioni da prendere fin dalla Fase 1 per evitare di rifare architettura o consensi durante la sperimentazione.

*Analisi preliminare — non costituisce parere legale. Necessaria la validazione del RPD dell'istituto prima dell'adozione operativa.*
