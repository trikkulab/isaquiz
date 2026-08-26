// Contenuto "puro" della correzione: elenco domande con risposta data,
// corretta, e spiegazione completa (DomandaCard in modalita="correzione").
//
// Importante: questo componente non deve sapere DOVE viene mostrato. Verrà
// montato in tre contesti diversi, tutti con lo stesso contenuto:
//   1. come pagina intera, via questa route (/quiz/:quizId/risultati) — l'unico
//      implementato per ora
//   2. dentro ModaleCorrezione, su schermo stretto
//   3. dentro PannelloArgomenti, inline, su schermo largo
// I contesti 2 e 3 arrivano quando si costruisce la pagina statistiche (Fase 4/5).
// Niente logica di navigazione o layout specifica di un contesto qui dentro.
//
// I dati arrivano in uno dei due modi:
//   - già in memoria, passati via navigate(..., { state }) da QuizStudente
//     appena lo studente finisce il quiz — il caso comune, nessuna lettura extra.
//   - TODO Fase 1 (seguito) / Fase 4: risposteRepository.getRisposteQuiz(...)
//     quando si apre questa route senza essere passati da QuizStudente (link
//     diretto, refresh, o dal futuro drill-down statistiche). Non ancora
//     implementato: risposteRepository è ancora uno stub.

import { useLocation } from "react-router-dom";

import DomandaCard from "../components/DomandaCard.jsx";

export default function QuizRisultati() {
  const { state } = useLocation();

  if (!state?.quiz || !state?.risposte) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-10 text-center">
        <p className="text-[#1e1b2e]/70">
          Correzione non disponibile: apri questa pagina dal pulsante "Vedi risultati" alla fine di un quiz.
        </p>
      </div>
    );
  }

  const { quiz, risposte } = state;
  const risposteCorrette = quiz.domande.filter(
    (domanda) => risposte[domanda.id] === domanda.indiceCorretto
  ).length;

  return (
    <div className="mx-auto max-w-[560px] px-4 py-6">
      <header className="mb-6 rounded-[22px] bg-gradient-to-br from-primario to-primario-scuro px-5 py-6 text-white shadow-morbida">
        <p className="text-[13px] opacity-85">
          {quiz.materia} · {quiz.docente}
        </p>
        <h1 className="mt-1 font-titoli text-xl font-bold">{quiz.titolo}</h1>
        <p className="mt-3 font-titoli text-3xl font-extrabold">
          {risposteCorrette} / {quiz.domande.length}
        </p>
        <p className="text-[13px] opacity-85">risposte corrette</p>
      </header>

      <div className="flex flex-col gap-4">
        {quiz.domande.map((domanda) => (
          <DomandaCard
            key={domanda.id}
            modalita="correzione"
            domanda={domanda}
            indiceSelezionato={risposte[domanda.id] ?? null}
            indiceCorretto={domanda.indiceCorretto}
            spiegazione={domanda.spiegazione}
            argomento={domanda.argomento}
          />
        ))}
      </div>
    </div>
  );
}
