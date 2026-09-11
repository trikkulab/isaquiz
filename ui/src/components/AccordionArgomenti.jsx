// Vista sotto la soglia desktop (vedi useBreakpoint): lista di argomenti con
// punteggio aggregato; il tap su un argomento espande INLINE la lista dei quiz
// che vi hanno contribuito (drill-down, nessun cambio di route — vedi
// DECISIONI_DESIGN.md, "Statistiche studente"). Il tap su un quiz apre
// ModaleCorrezione.
//
// I dati arrivano già aggregati da risposteRepository.getStatistichePerArgomento
// (forma annidata: ogni argomento porta con sé i suoi quiz col punteggio
// contestuale), quindi il drill-down non fa altre letture.

import { useState } from "react";

import PunteggioContestuale from "./PunteggioContestuale.jsx";
import ModaleCorrezione from "./ModaleCorrezione.jsx";

export default function AccordionArgomenti({ argomenti, studenteId }) {
  const [apertoChiave, setApertoChiave] = useState(null);
  const [correzione, setCorrezione] = useState(null); // { quizId } | null

  return (
    <>
      <ul className="flex flex-col gap-2">
        {argomenti.map((arg) => {
          const aperto = apertoChiave === arg.chiave;
          return (
            <li
              key={arg.chiave}
              className="overflow-hidden rounded-xl border border-bordo bg-superficie"
            >
              <button
                type="button"
                onClick={() => setApertoChiave(aperto ? null : arg.chiave)}
                aria-expanded={aperto}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className="text-xs text-inchiostro/40 transition-transform"
                  style={{ transform: aperto ? "rotate(90deg)" : "none" }}
                  aria-hidden="true"
                >
                  ▶
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {arg.argomento}
                  </span>
                  {arg.materia && (
                    <span className="block truncate text-xs text-inchiostro/45">
                      {arg.materia}
                    </span>
                  )}
                </span>
                <PunteggioContestuale corrette={arg.corrette} totali={arg.totali} />
              </button>

              {aperto && (
                <ul className="border-t border-bordo">
                  {arg.quiz.map((q) => (
                    <li key={q.quizId}>
                      <button
                        type="button"
                        onClick={() => setCorrezione({ quizId: q.quizId })}
                        className="flex w-full items-center gap-3 px-4 py-2.5 pl-9 text-left hover:bg-sfondo"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-inchiostro/80">
                          {q.titolo}
                        </span>
                        <PunteggioContestuale corrette={q.corrette} totali={q.totali} />
                        <span className="shrink-0 text-xs font-medium text-primario">
                          Correzione
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {correzione && (
        <ModaleCorrezione
          quizId={correzione.quizId}
          studenteId={studenteId}
          onChiudi={() => setCorrezione(null)}
        />
      )}
    </>
  );
}
