// Contenuto "puro" della correzione: elenco quesiti con risposta data,
// corretta, e spiegazione completa (QuesitoCard in modalita="correzione").
//
// Non sa DOVE viene mostrato né COME arrivano i dati: riceve `quiz` (con
// quesiti risolti) e `risposte` ({ [quesitoId]: opzioneScelta }) come prop.
// Chi lo monta li procura (da navigate state o da risposteRepository) — vedi
// QuizRisultatiPagina; in Fase 4/5 anche ModaleCorrezione / PannelloArgomenti.
// Niente logica di navigazione, layout, o fetch qui dentro.
//
// Il giusto/sbagliato è calcolato qui lato client (rispostaData vs
// indiceCorretto) — rischio noto e accettato, vedi DECISIONI_DESIGN.md,
// "Flusso quiz studente".

import QuesitoCard from "../components/QuesitoCard.jsx";

export default function QuizRisultati({ quiz, risposte }) {
  if (!quiz || !risposte) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-10 text-center">
        <p className="text-[#1e1b2e]/70">Correzione non disponibile.</p>
      </div>
    );
  }

  const risposteCorrette = quiz.quesiti.filter(
    (quesito) => risposte[quesito.id] === quesito.indiceCorretto,
  ).length;

  return (
    <div className="mx-auto max-w-[560px] px-4 py-6">
      <header className="mb-6 rounded-[22px] bg-gradient-to-br from-primario to-primario-scuro px-5 py-6 text-white shadow-morbida">
        {[quiz.materia, quiz.docente].some(Boolean) && (
          <p className="text-[13px] opacity-85">
            {[quiz.materia, quiz.docente].filter(Boolean).join(" · ")}
          </p>
        )}
        <h1 className="mt-1 font-titoli text-xl font-bold">{quiz.titolo}</h1>
        <p className="mt-3 font-titoli text-3xl font-extrabold">
          {risposteCorrette} / {quiz.quesiti.length}
        </p>
        <p className="text-[13px] opacity-85">risposte corrette</p>
      </header>

      <div className="flex flex-col gap-4">
        {quiz.quesiti.map((quesito) => (
          <QuesitoCard
            key={quesito.id}
            modalita="correzione"
            quesito={quesito}
            indiceSelezionato={risposte[quesito.id] ?? null}
            indiceCorretto={quesito.indiceCorretto}
            spiegazione={quesito.spiegazione}
            argomento={quesito.argomento}
          />
        ))}
      </div>
    </div>
  );
}
