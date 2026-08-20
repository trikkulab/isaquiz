// Contenuto "puro" della correzione: elenco domande con risposta data, corretta,
// e spiegazione completa. Ogni domanda mostra il proprio tag di argomento
// (DomandaCard con mostraSpiegazione=true), utile quando il quiz è misto
// (es. un ripasso con domande di più argomenti).
//
// Importante: questo componente non deve sapere DOVE viene mostrato.
// Viene montato in tre contesti diversi, tutti con lo stesso contenuto:
//   1. come pagina intera, via questa route (/quiz/:quizId/risultati)
//   2. dentro ModaleCorrezione, su schermo stretto
//   3. dentro PannelloArgomenti, inline, su schermo largo
// I dati arrivano o da risposteRepository.getRisposteQuiz(...), o già in memoria
// se lo studente ha appena finito il quiz (nessuna lettura extra in quel caso).
//
// TODO Fase 1 (contenuto base) — i tre contenitori arrivano quando si costruisce
// la pagina statistiche.

export default function QuizRisultati() {
  return <div>QuizRisultati — TODO</div>;
}
