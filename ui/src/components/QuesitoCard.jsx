// Un singolo quesito a risposta multipla. Riusato in due modalità:
//
// - "quiz" (default), durante lo svolgimento: cliccabile, feedback solo ✓/✗
//   sulla scelta fatta. Se lo studente sbaglia, l'opzione corretta NON viene
//   mai rivelata — è l'informazione più facile da suggerire a voce a un
//   compagno ancora sullo stesso quesito (vedi DECISIONI_DESIGN.md, "Flusso
//   quiz studente").
// - "correzione", in QuizRisultati: sola lettura, mostra sempre la risposta
//   corretta (anche quando lo studente ha sbagliato) e l'eventuale
//   spiegazione completa.
//
// Props comuni:
//   - quesito: { testo, opzioni: string[] }
//   - indiceSelezionato: number | null
//
// Props modalità "quiz":
//   - corretta: boolean | null — esito della scelta, noto solo dopo aver risposto
//   - onSeleziona(indice): chiamata solo se non si è ancora risposto
//
// Props modalità "correzione":
//   - indiceCorretto: number
//   - spiegazione?: string
//   - argomento?: string — sempre visibile se presente, anche in un quiz misto
//     (più argomenti): aiuta a riconoscere i quesiti "fuori tema" (vedi
//     DECISIONI_DESIGN.md, "Correzione").

const BASE_OPZIONE =
  "flex w-full items-center justify-between gap-2.5 rounded-[14px] border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-colors duration-150 [&:not(:disabled)]:cursor-pointer [&:not(:disabled)]:hover:border-primario [&:not(:disabled)]:active:scale-[0.98] disabled:cursor-default";

export default function QuesitoCard({
  quesito,
  indiceSelezionato,
  corretta = null,
  indiceCorretto = null,
  spiegazione,
  argomento,
  onSeleziona,
  modalita = "quiz",
}) {
  const inCorrezione = modalita === "correzione";
  const haRisposto = inCorrezione || indiceSelezionato !== null;

  function classeOpzione(indice) {
    if (inCorrezione) {
      if (indice === indiceCorretto) {
        return `${BASE_OPZIONE} border-corretto bg-corretto-sfondo text-[#1e1b2e]`;
      }
      if (indice === indiceSelezionato) {
        return `${BASE_OPZIONE} border-errore bg-errore-sfondo text-[#1e1b2e]`;
      }
      return `${BASE_OPZIONE} border-bordo bg-white text-[#1e1b2e] opacity-55`;
    }

    if (indice !== indiceSelezionato) {
      return `${BASE_OPZIONE} border-bordo bg-white text-[#1e1b2e]` + (haRisposto ? " opacity-55" : "");
    }
    if (!haRisposto) {
      return `${BASE_OPZIONE} border-bordo bg-white text-[#1e1b2e]`;
    }
    return corretta
      ? `${BASE_OPZIONE} border-corretto bg-corretto-sfondo text-[#1e1b2e]`
      : `${BASE_OPZIONE} border-errore bg-errore-sfondo text-[#1e1b2e]`;
  }

  function esito(indice) {
    if (inCorrezione) {
      if (indice === indiceCorretto) return "✓";
      if (indice === indiceSelezionato) return "✗";
      return null;
    }
    if (indice === indiceSelezionato && haRisposto) return corretta ? "✓" : "✗";
    return null;
  }

  return (
    <div className="rounded-[22px] bg-white px-5 py-6 shadow-morbida">
      {inCorrezione && argomento && (
        <span className="mb-2 inline-block rounded-full bg-sfondo px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primario">
          {argomento}
        </span>
      )}
      <h2 className="mb-5 text-xl leading-snug">{quesito.testo}</h2>

      <div className="flex flex-col gap-3">
        {quesito.opzioni.map((opzione, indice) => {
          const segno = esito(indice);
          return (
            <button
              key={indice}
              type="button"
              className={classeOpzione(indice)}
              onClick={() => onSeleziona?.(indice)}
              disabled={inCorrezione || haRisposto}
            >
              <span className="flex-1">{opzione}</span>
              {segno && (
                <span
                  className={"text-base font-bold " + (segno === "✓" ? "text-corretto" : "text-errore")}
                  aria-hidden="true"
                >
                  {segno}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {inCorrezione && spiegazione && (
        <p className="mt-4 rounded-[14px] bg-sfondo px-4 py-3 text-sm leading-relaxed text-[#1e1b2e]/80">
          {spiegazione}
        </p>
      )}
    </div>
  );
}
