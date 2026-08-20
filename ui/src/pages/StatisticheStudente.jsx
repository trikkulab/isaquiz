// Statistiche personali dello studente: filtro per materia/anno (FiltroMaterie),
// poi lista argomenti con punteggio aggregato.
//
// Layout adattivo, non solo responsive: sotto una certa larghezza (vedi
// useBreakpoint) si usa AccordionArgomenti + ModaleCorrezione; sopra, si usa
// PannelloArgomenti con QuizRisultati mostrato inline, senza modale.
// Il contenuto (QuizRisultati) è identico nei due casi — cambia solo il contenitore.
//
// Ogni riga quiz nell'elenco per argomento mostra il punteggio CONTESTUALE
// ("3/4 su questo argomento"), non il punteggio totale del quiz — il totale
// si vede solo aprendo la correzione completa.
//
// TODO Fase 4/5 (ha senso solo quando c'è storico risultati sufficiente).

export default function StatisticheStudente() {
  return <div>StatisticheStudente — TODO</div>;
}
