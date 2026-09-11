// Percorso ESTERNO di generazione domande (Fase 3) — vedi
// DECISIONI_DESIGN.md, "Generazione domande: interna vs esterna": la
// piattaforma non chiama mai un provider IA per conto del docente. Qui si
// mostra solo un prompt-template copiabile; il docente lo usa in un proprio
// strumento IA personale (ChatGPT, Gemini, ...) e incolla il JSON risultante,
// che viene validato e passato a RevisioneQuesiti — stesso punto di unione
// del futuro percorso interno.

import { useMemo, useState } from "react";

import RevisioneQuesiti from "./RevisioneQuesiti.jsx";
import { validaPayloadCandidati } from "../utils/validazioneQuesitiCandidati.js";

const CAMPO =
  "w-full rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm outline-none focus:border-primario";
const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-su-primario transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";
const BOTTONE_SECONDARIO =
  "rounded-lg border border-bordo bg-superficie px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario disabled:cursor-not-allowed disabled:opacity-40";

const NUM_DEFAULT = 5;
const NUM_MIN = 1;
const NUM_MAX = 20;

function generaPrompt(argomento, numero) {
  const contenuto = argomento.trim() || "[inserisci qui l'argomento o i tuoi appunti di lezione]";
  return `Genera ${numero} quesiti a risposta multipla in italiano, per una verifica scolastica, sul seguente argomento.

Argomento/appunti:
"""
${contenuto}
"""

Regole per ogni quesito:
- "testo": il testo della domanda.
- "opzioni": un array di almeno 2 e al massimo 6 stringhe (le alternative di risposta).
- "indiceCorretto": l'indice (a partire da 0) dell'opzione corretta nell'array "opzioni".
- "spiegazione": sempre presente, spiega brevemente perché la risposta è corretta.
- "argomento": opzionale, un sotto-argomento specifico del quesito.
Non inventare fatti: se non sei certo di un dettaglio, scegli un altro quesito.

Rispondi SOLO con un oggetto JSON in questo formato esatto, senza testo prima o dopo e senza blocchi di codice markdown:
{"quesiti":[{"testo":"...","opzioni":["...","...","..."],"indiceCorretto":0,"spiegazione":"...","argomento":"..."}]}`;
}

export default function ImportaQuesitiIA({ materia, autoreId, onQuesitoCreato, onChiudi }) {
  const [argomento, setArgomento] = useState("");
  const [numero, setNumero] = useState(NUM_DEFAULT);
  const [copiato, setCopiato] = useState(false);
  const [testoIncollato, setTestoIncollato] = useState("");
  const [erroreParsing, setErroreParsing] = useState(null);
  const [candidati, setCandidati] = useState(null); // array dopo "Analizza" riuscito

  const prompt = useMemo(() => generaPrompt(argomento, numero), [argomento, numero]);

  async function copiaPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      /* clipboard non disponibile: il docente seleziona il testo a mano */
    }
  }

  function analizza() {
    setErroreParsing(null);
    let payload;
    try {
      payload = JSON.parse(testoIncollato);
    } catch {
      setErroreParsing("Il testo incollato non è un JSON valido.");
      return;
    }
    const { valido, errore } = validaPayloadCandidati(payload);
    if (!valido) {
      setErroreParsing(errore);
      return;
    }
    setCandidati(payload.quesiti);
  }

  if (candidati) {
    return (
      <RevisioneQuesiti
        quesiti={candidati}
        materia={materia}
        autoreId={autoreId}
        fonte="ia-esterna"
        onSalvato={onQuesitoCreato}
        onChiudi={onChiudi}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-bordo bg-superficie p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Importa quesiti da IA esterna</h2>
        <button type="button" className="text-xs font-medium text-primario" onClick={onChiudi}>
          Torna alla banca
        </button>
      </div>

      <div className="rounded-lg border border-bordo bg-sfondo px-3 py-2 text-xs text-inchiostro/70">
        Nell'argomento/appunti qui sotto non inserire nomi, voti o altri dati di studenti
        specifici: solo il contenuto della lezione. Il prompt va copiato nel tuo strumento IA
        personale (es. ChatGPT, Gemini) — isaquiz non lo invia da nessuna parte.
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-inchiostro/60">
            Argomento / appunti della lezione
          </span>
          <textarea
            className={`${CAMPO} resize-y`}
            rows={3}
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

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-inchiostro/60">
          Prompt pronto da copiare
        </span>
        <textarea
          className={`${CAMPO} resize-y font-mono text-xs`}
          rows={6}
          value={prompt}
          readOnly
          onFocus={(e) => e.target.select()}
        />
      </label>
      <button type="button" className={`${BOTTONE_SECONDARIO} self-start`} onClick={copiaPrompt}>
        {copiato ? "Copiato" : "Copia il prompt"}
      </button>

      <div className="border-t border-bordo pt-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-inchiostro/60">
            Incolla qui il JSON restituito dallo strumento IA
          </span>
          <textarea
            className={`${CAMPO} resize-y font-mono text-xs`}
            rows={6}
            value={testoIncollato}
            onChange={(e) => setTestoIncollato(e.target.value)}
            placeholder='{"quesiti": [...]}'
          />
        </label>
        {erroreParsing && <p className="mt-2 text-sm text-errore">{erroreParsing}</p>}
        <button
          type="button"
          className={`${BOTTONE_PRIMARIO} mt-3`}
          onClick={analizza}
          disabled={testoIncollato.trim() === ""}
        >
          Analizza
        </button>
      </div>
    </div>
  );
}
