// Una singola domanda a risposta multipla, con feedback immediato (✓/✗) subito
// dopo la scelta, ma senza spiegazione — la spiegazione completa si vede solo
// dopo, in QuizRisultati (fuori dallo scope di questo componente).
//
// Props:
//   - domanda: { testo, opzioni: string[] }
//   - indiceSelezionato: number | null — opzione scelta dallo studente, null se non ancora risposto
//   - corretta: boolean | null — esito della scelta, noto solo dopo aver risposto
//   - onSeleziona(indice): chiamata solo se non si è ancora risposto
//
// Importante (vedi DECISIONI_DESIGN.md, "Flusso quiz studente"): questo
// componente non riceve MAI, durante lo svolgimento, quale sia l'opzione
// corretta — solo se la scelta fatta era giusta o sbagliata. Se lo studente
// sbaglia, l'opzione corretta non viene evidenziata in alcun modo: è
// l'informazione più facile da suggerire a voce a un compagno ancora sulla
// stessa domanda. La prop che rivela l'opzione corretta esiste solo nel
// contesto QuizRisultati (fuori dallo scope di questo componente).

const BASE_OPZIONE =
  "flex w-full items-center justify-between gap-2.5 rounded-[14px] border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-colors duration-150 [&:not(:disabled)]:cursor-pointer [&:not(:disabled)]:hover:border-primario [&:not(:disabled)]:active:scale-[0.98] disabled:cursor-default";

export default function DomandaCard({ domanda, indiceSelezionato, corretta, onSeleziona }) {
  const haRisposto = indiceSelezionato !== null;

  function classeOpzione(indice) {
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

  return (
    <div className="rounded-[22px] bg-white px-5 py-6 shadow-morbida">
      <h2 className="mb-5 text-xl leading-snug">{domanda.testo}</h2>

      <div className="flex flex-col gap-3">
        {domanda.opzioni.map((opzione, indice) => (
          <button
            key={indice}
            type="button"
            className={classeOpzione(indice)}
            onClick={() => onSeleziona(indice)}
            disabled={haRisposto}
          >
            <span className="flex-1">{opzione}</span>
            {haRisposto && indice === indiceSelezionato && (
              <span
                className={"text-base font-bold " + (corretta ? "text-corretto" : "text-errore")}
                aria-hidden="true"
              >
                {corretta ? "✓" : "✗"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
