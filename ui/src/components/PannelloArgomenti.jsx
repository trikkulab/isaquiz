// Vista sopra la soglia desktop (layout ADATTIVO, non solo responsive — vedi
// DECISIONI_DESIGN.md, "Layout adattivo"): master-detail, lista argomenti a
// sinistra, dettaglio a destra (lista quiz dell'argomento + CorrezioneQuiz
// inline quando un quiz è selezionato). Nessun modale: c'è spazio per mostrare
// lista e dettaglio insieme.
//
// Stessi dati di AccordionArgomenti (forma annidata di
// getStatistichePerArgomento), stesso QuizRisultati come contenuto: cambia
// solo il contenitore.

import { useState } from "react";

import PunteggioContestuale from "./PunteggioContestuale.jsx";
import CorrezioneQuiz from "./CorrezioneQuiz.jsx";
import { coloreMateria, livelloPadronanza } from "../utils/colori.js";

export default function PannelloArgomenti({ argomenti, studenteId }) {
  const [chiaveSel, setChiaveSel] = useState(() => argomenti[0]?.chiave ?? null);
  const [quizSel, setQuizSel] = useState(null);

  const argomento =
    argomenti.find((a) => a.chiave === chiaveSel) ?? argomenti[0] ?? null;

  function selezionaArgomento(chiave) {
    setChiaveSel(chiave);
    setQuizSel(null);
  }

  return (
    <div className="grid grid-cols-[minmax(220px,300px)_1fr] gap-4">
      <ul className="flex flex-col gap-1">
        {argomenti.map((arg) => {
          const attivo = argomento && arg.chiave === argomento.chiave;
          return (
            <li key={arg.chiave}>
              <button
                type="button"
                onClick={() => selezionaArgomento(arg.chiave)}
                aria-current={attivo ? "true" : undefined}
                className={`flex w-full flex-col gap-1.5 rounded-xl border-y border-r border-l-[3px] px-3.5 py-3 text-left transition-colors ${coloreMateria(
                  arg.materia
                )} ${
                  attivo
                    ? "border-y-primario border-r-primario bg-primario/5"
                    : "border-y-bordo border-r-bordo bg-superficie hover:border-y-primario/50 hover:border-r-primario/50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {arg.argomento}
                  </span>
                  {arg.materia && (
                    <span className="block truncate text-xs text-inchiostro/45">
                      {arg.materia}
                    </span>
                  )}
                </span>
                <PunteggioContestuale
                  corrette={arg.corrette}
                  totali={arg.totali}
                  livello={livelloPadronanza(arg.corrette, arg.totali)}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="min-w-0 rounded-xl border border-bordo bg-superficie">
        {!argomento ? (
          <p className="px-4 py-10 text-center text-sm text-inchiostro/55">
            Seleziona un argomento.
          </p>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-bordo px-4 py-3">
              <h2 className="text-sm font-semibold">{argomento.argomento}</h2>
              <p className="mt-0.5 text-xs text-inchiostro/55">
                {[
                  argomento.materia,
                  `${argomento.corrette} / ${argomento.totali} corrette in totale`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <ul>
              {argomento.quiz.map((q) => {
                const aperto = quizSel === q.quizId;
                return (
                  <li key={q.quizId} className="border-b border-bordo last:border-0">
                    <button
                      type="button"
                      onClick={() => setQuizSel(aperto ? null : q.quizId)}
                      aria-expanded={aperto}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sfondo"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-inchiostro/80">
                        {q.titolo}
                      </span>
                      <PunteggioContestuale corrette={q.corrette} totali={q.totali} />
                      <span className="shrink-0 text-xs font-medium text-primario">
                        {aperto ? "Nascondi" : "Correzione"}
                      </span>
                    </button>
                    {aperto && (
                      <div className="border-t border-bordo bg-sfondo">
                        <CorrezioneQuiz quizId={q.quizId} studenteId={studenteId} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
