// Vista sotto la soglia desktop (vedi useBreakpoint): lista di studenti di UN
// corso con il segnale di trend a livello materia (vedi
// DECISIONI_DESIGN.md, "Andamento studente"); il tap espande INLINE la
// rottura per argomento (frazione grezza, niente trend qui) e la serie dei
// quiz svolti. Il tap su un quiz apre ModaleCorrezione — stesso componente
// della vista studente: le rules permettono all'autore del quiz di leggere
// le risposte di qualunque studente.
//
// I dati arrivano già aggregati da risposteRepository.getAndamentoCorso, il
// drill-down non fa altre letture.

import { useState } from "react";

import PunteggioContestuale from "./PunteggioContestuale.jsx";
import ModaleCorrezione from "./ModaleCorrezione.jsx";
import { livelloPadronanza, ETICHETTA_SEGNALE, BADGE_SEGNALE } from "../utils/colori.js";

export default function AccordionAndamento({ studenti }) {
  const [apertoId, setApertoId] = useState(null);
  const [correzione, setCorrezione] = useState(null); // { quizId, studenteId } | null

  return (
    <>
      <ul className="flex flex-col gap-2">
        {studenti.map((s) => {
          const aperto = apertoId === s.studenteId;
          return (
            <li
              key={s.studenteId}
              className="overflow-hidden rounded-xl border border-bordo bg-superficie"
            >
              <button
                type="button"
                onClick={() => setApertoId(aperto ? null : s.studenteId)}
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
                  <span className="block truncate text-sm font-semibold">{s.nome}</span>
                  <span className="block truncate text-xs text-inchiostro/45">
                    {s.nQuiz} quiz · media {s.media}%
                  </span>
                </span>
                {s.segnale && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${BADGE_SEGNALE[s.segnale]}`}
                  >
                    {ETICHETTA_SEGNALE[s.segnale]}
                  </span>
                )}
              </button>

              {aperto && (
                <div className="border-t border-bordo">
                  <ul className="px-4 py-2">
                    {s.argomenti.map((a) => (
                      <li
                        key={a.argomento}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-inchiostro/80">
                          {a.argomento}
                        </span>
                        <PunteggioContestuale
                          corrette={a.corrette}
                          totali={a.totali}
                          livello={livelloPadronanza(a.corrette, a.totali)}
                        />
                      </li>
                    ))}
                  </ul>
                  <ul className="border-t border-bordo">
                    {s.serieQuiz.map((q) => (
                      <li key={q.quizId}>
                        <button
                          type="button"
                          onClick={() =>
                            setCorrezione({ quizId: q.quizId, studenteId: s.studenteId })
                          }
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
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {correzione && (
        <ModaleCorrezione
          quizId={correzione.quizId}
          studenteId={correzione.studenteId}
          onChiudi={() => setCorrezione(null)}
        />
      )}
    </>
  );
}
