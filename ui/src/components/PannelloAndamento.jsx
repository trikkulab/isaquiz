// Vista sopra la soglia desktop (layout ADATTIVO — vedi
// DECISIONI_DESIGN.md, "Layout adattivo"): master-detail, lista studenti di
// UN corso a sinistra, dettaglio a destra (argomenti + serie quiz, con
// correzione inline quando un quiz è selezionato). Nessun modale: c'è
// spazio per mostrare lista e dettaglio insieme.
//
// Stessi dati di AccordionAndamento (risposteRepository.getAndamentoCorso),
// stesso CorrezioneQuiz: cambia solo il contenitore.

import { useState } from "react";

import PunteggioContestuale from "./PunteggioContestuale.jsx";
import CorrezioneQuiz from "./CorrezioneQuiz.jsx";
import { livelloPadronanza, ETICHETTA_SEGNALE, BADGE_SEGNALE } from "../utils/colori.js";

export default function PannelloAndamento({ studenti }) {
  const [idSel, setIdSel] = useState(() => studenti[0]?.studenteId ?? null);
  const [quizSel, setQuizSel] = useState(null);

  const studente = studenti.find((s) => s.studenteId === idSel) ?? studenti[0] ?? null;

  function seleziona(id) {
    setIdSel(id);
    setQuizSel(null);
  }

  return (
    <div className="grid grid-cols-[minmax(220px,300px)_1fr] gap-4">
      <ul className="flex flex-col gap-1">
        {studenti.map((s) => {
          const attivo = studente && s.studenteId === studente.studenteId;
          return (
            <li key={s.studenteId}>
              <button
                type="button"
                onClick={() => seleziona(s.studenteId)}
                aria-current={attivo ? "true" : undefined}
                className={`flex w-full flex-col gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  attivo
                    ? "border-primario bg-primario/5"
                    : "border-bordo bg-superficie hover:border-primario/50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold">{s.nome}</span>
                  {s.segnale && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${BADGE_SEGNALE[s.segnale]}`}
                    >
                      {ETICHETTA_SEGNALE[s.segnale]}
                    </span>
                  )}
                </span>
                <span className="text-xs text-inchiostro/45">
                  {s.nQuiz} quiz · media {s.media}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="min-w-0 rounded-xl border border-bordo bg-superficie">
        {!studente ? (
          <p className="px-4 py-10 text-center text-sm text-inchiostro/55">
            Seleziona uno studente.
          </p>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-bordo px-4 py-3">
              <h2 className="text-sm font-semibold">{studente.nome}</h2>
              <p className="mt-0.5 text-xs text-inchiostro/55">
                {studente.nQuiz} quiz · media {studente.media}%
              </p>
            </div>

            <ul className="border-b border-bordo px-4 py-2">
              {studente.argomenti.map((a) => (
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

            <ul>
              {studente.serieQuiz.map((q) => {
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
                        <CorrezioneQuiz quizId={q.quizId} studenteId={studente.studenteId} />
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
