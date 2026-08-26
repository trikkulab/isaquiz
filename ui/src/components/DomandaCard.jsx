// Una singola domanda a risposta multipla, con feedback immediato (✓/✗) subito
// dopo la scelta, ma senza spiegazione — la spiegazione completa si vede solo
// dopo, in QuizRisultati (fuori dallo scope di questo componente).
//
// Props:
//   - domanda: { testo, opzioni: string[] }
//   - indiceSelezionato: number | null — opzione scelta dallo studente, null se non ancora risposto
//   - indiceCorretto: number | null — noto solo dopo la risposta (vedi nota sotto)
//   - onSeleziona(indice): chiamata solo se non si è ancora risposto
//
// Nota di design ancora aperta: per mostrare il feedback SUBITO, senza andata e
// ritorno dal server, questo componente deve conoscere l'opzione corretta della
// domanda non appena lo studente risponde. Questo è un dato di dominio della
// domanda (non del punteggio) e non viola la regola su risposta.corretta — che
// riguarda solo il campo scritto lato server nella collezione risposte. Va
// però deciso esplicitamente, quando si disegnano le regole di sicurezza di
// Firestore, se e come esporre l'opzione corretta della domanda al client.

const BASE_OPZIONE =
  "flex w-full items-center justify-between gap-2.5 rounded-[14px] border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-colors duration-150 [&:not(:disabled)]:cursor-pointer [&:not(:disabled)]:hover:border-primario [&:not(:disabled)]:active:scale-[0.98] disabled:cursor-default";

export default function DomandaCard({ domanda, indiceSelezionato, indiceCorretto, onSeleziona }) {
  const haRisposto = indiceSelezionato !== null;

  function classeOpzione(indice) {
    if (!haRisposto) {
      return `${BASE_OPZIONE} border-bordo bg-white text-[#1e1b2e]`;
    }
    if (indice === indiceCorretto) {
      return `${BASE_OPZIONE} border-corretto bg-corretto-sfondo text-[#1e1b2e]`;
    }
    if (indice === indiceSelezionato) {
      return `${BASE_OPZIONE} border-errore bg-errore-sfondo text-[#1e1b2e]`;
    }
    return `${BASE_OPZIONE} border-bordo bg-white text-[#1e1b2e] opacity-55`;
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
            {haRisposto && indice === indiceCorretto && (
              <span className="text-base font-bold text-corretto" aria-hidden="true">
                ✓
              </span>
            )}
            {haRisposto && indice === indiceSelezionato && indice !== indiceCorretto && (
              <span className="text-base font-bold text-errore" aria-hidden="true">
                ✗
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
