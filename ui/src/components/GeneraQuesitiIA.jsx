// Percorso INTERNO di generazione domande (Fase 3) — vedi
// DECISIONI_DESIGN.md, "Generazione domande: interna vs esterna": qui la
// piattaforma chiama davvero un provider IA per conto del docente (a
// differenza di ImportaQuesitiIA.jsx, percorso esterno). Riservato
// all'autore per dogfooding: il bottone che monta questo componente è
// visibile solo se `utente.generazioneIA === true` (vedi CreaQuiz.jsx), ma
// la guardia vera è server-side in functions/aiProvider.js.

import { useState } from "react";

import RevisioneQuesiti from "./RevisioneQuesiti.jsx";
import { generaQuesitiIA } from "../../../data/aiRepository.js";

const CAMPO =
  "w-full rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm outline-none focus:border-primario";
const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-su-primario transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";

const NUM_DEFAULT = 5;
const NUM_MIN = 1;
const NUM_MAX = 20;

function messaggioErrore(errore) {
  switch (errore?.code) {
    case "functions/permission-denied":
      return "Generazione IA non abilitata per questo utente.";
    case "functions/resource-exhausted":
      return errore.message || "Limite giornaliero di generazioni IA raggiunto. Riprova domani.";
    case "functions/invalid-argument":
      return errore.message || "Dati non validi.";
    default:
      return "Errore nella generazione. Riprova tra qualche istante.";
  }
}

export default function GeneraQuesitiIA({ materia, autoreId, onQuesitoCreato, onChiudi }) {
  const [argomento, setArgomento] = useState("");
  const [numero, setNumero] = useState(NUM_DEFAULT);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState(null);
  const [candidati, setCandidati] = useState(null);

  async function genera() {
    setErrore(null);
    setInCorso(true);
    try {
      const quesiti = await generaQuesitiIA({ testo: argomento.trim(), numero });
      setCandidati(quesiti);
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setInCorso(false);
    }
  }

  if (candidati) {
    return (
      <RevisioneQuesiti
        quesiti={candidati}
        materia={materia}
        autoreId={autoreId}
        fonte="ia-interna"
        onSalvato={onQuesitoCreato}
        onChiudi={onChiudi}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-bordo bg-superficie p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Genera quesiti con IA</h2>
        <button type="button" className="text-xs font-medium text-primario" onClick={onChiudi}>
          Torna alla banca
        </button>
      </div>

      <div className="rounded-lg border border-bordo bg-sfondo px-3 py-2 text-xs text-inchiostro/70">
        Nell'argomento/appunti qui sotto non inserire nomi, voti o altri dati di studenti
        specifici: solo il contenuto della lezione. Il testo viene inviato a un provider IA
        esterno (Google Gemini).
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-inchiostro/60">
            Argomento / appunti della lezione
          </span>
          <textarea
            className={`${CAMPO} resize-y`}
            rows={4}
            value={argomento}
            onChange={(e) => setArgomento(e.target.value)}
            placeholder="Es. Il Rinascimento italiano: mecenatismo, arte, invenzioni…"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-inchiostro/60">Quanti quesiti</span>
          <input
            type="number"
            min={NUM_MIN}
            max={NUM_MAX}
            className={CAMPO}
            value={numero}
            onChange={(e) =>
              setNumero(Math.min(NUM_MAX, Math.max(NUM_MIN, Number(e.target.value) || NUM_MIN)))
            }
          />
        </label>
      </div>

      {errore && <p className="text-sm text-errore">{errore}</p>}

      <button
        type="button"
        className={`${BOTTONE_PRIMARIO} self-start`}
        onClick={genera}
        disabled={inCorso || argomento.trim() === ""}
      >
        {inCorso ? "Generazione in corso…" : "Genera"}
      </button>
    </div>
  );
}
