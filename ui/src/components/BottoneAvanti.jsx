// Pulsante "avanti" di QuizStudente. Oltre al tap manuale, avanza da solo
// dopo DURATA_AVANZAMENTO_AUTOMATICO_MS, con un riempimento progressivo
// (stile barra delle "storie" Instagram/Google Maps) — il ritmo resta comunque
// libero per lo studente: un tap in qualsiasi momento interrompe il timer e
// avanza subito (vedi DECISIONI_DESIGN.md, "Flusso quiz studente").
//
// Il timer vive QUI, non in QuizStudente.jsx: nel genitore questo componente
// è montato dentro `{indiceSelezionato !== null && (...)}`, quindi ogni volta
// che lo studente risponde a un NUOVO quesito il componente viene smontato e
// rimontato da zero (non solo aggiornato) — è già l'evento "nuova risposta
// data, riparti dal timer". Un useEffect con dipendenze [] al mount ottiene
// gratis il reset ad ogni quesito; tenere il timer nel genitore avrebbe
// richiesto di reimplementare a mano lo stesso reset con un useEffect
// dipendente dal quesito corrente, per nessun vantaggio.
//
// Il riempimento è un overlay bianco translucido (stesso linguaggio visivo
// dei segmenti di avanzamento in BarraQuiz) — colore volutamente neutro,
// non lega mai a giusto/sbagliato: quel segnale resta solo su QuesitoCard.

import { useEffect, useRef, useState } from "react";
import { DURATA_AVANZAMENTO_AUTOMATICO_MS } from "../config/impostazioniQuiz.js";

export default function BottoneAvanti({ onAvanti, etichetta }) {
  const [riempito, setRiempito] = useState(false);
  const giaAvanzato = useRef(false);

  function avanza() {
    if (giaAvanzato.current) return;
    giaAvanzato.current = true;
    onAvanti();
  }

  useEffect(() => {
    // Un frame di ritardo prima di far partire il riempimento: garantisce che
    // il browser dipinga lo stato iniziale (scaleX 0) prima che la
    // transizione CSS verso lo stato finale (scaleX 1) parta, altrimenti
    // rischia di "saltare" subito al pieno senza animare.
    const frame = requestAnimationFrame(() => setRiempito(true));
    const timer = setTimeout(avanza, DURATA_AVANZAMENTO_AUTOMATICO_MS);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onClick={avanza}
      className="relative w-full max-w-[560px] animate-comparsa overflow-hidden rounded-full bg-gradient-to-br from-accento to-primario p-4 font-titoli text-base font-bold text-su-primario shadow-bottone active:scale-[0.98]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-su-primario/25 transition-transform ease-linear"
        style={{
          transitionDuration: `${DURATA_AVANZAMENTO_AUTOMATICO_MS}ms`,
          transform: riempito ? "scaleX(1)" : "scaleX(0)",
        }}
      />
      <span className="relative">{etichetta}</span>
    </button>
  );
}
