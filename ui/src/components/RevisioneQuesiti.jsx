// Pagina di revisione/validazione dei quesiti-candidati generati via IA —
// punto di unione tra i percorsi "interna" ed "esterna" (vedi
// DECISIONI_DESIGN.md, "Generazione domande: interna vs esterna").
// "Contenuto puro" rispetto alla provenienza: riceve l'array di candidati
// come prop, senza sapere se arrivano da un import JSON o da una chiamata IA
// diretta — chi la monta si occupa solo di procurarle l'array nel formato
// giusto e di passare `materia`/`autoreId`/`fonte`.
//
// Human in the loop obbligatorio: nessun quesito finisce in banca
// (`creaQuesito`) finché non è stato accettato esplicitamente riga per riga
// qui. Un elemento non valido non blocca gli altri — resta segnalato ed
// editabile a mano invece di obbligare a rigenerare l'intero array.

import { useMemo, useState } from "react";

import { creaQuesito } from "../../../data/quesitiRepository.js";
import { validaQuesitoCandidato } from "../utils/validazioneQuesitiCandidati.js";

const CAMPO =
  "w-full rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm outline-none focus:border-primario";
const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-su-primario transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";
const BOTTONE_SECONDARIO =
  "rounded-lg border border-bordo bg-superficie px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario disabled:cursor-not-allowed disabled:opacity-40";

const OPZIONI_MIN = 2;
const OPZIONI_MAX = 6;

// Campi di contenuto puliti da una riga in modifica: scarta le opzioni vuote
// riallineando l'indice della corretta — stessa logica di `contenutoDalForm`
// in CreaQuiz.jsx.
function contenutoRiga(dati) {
  const coppie = dati.opzioni
    .map((o, i) => ({ testo: (o ?? "").trim(), corretta: i === dati.indiceCorretto }))
    .filter((c) => c.testo !== "");
  return {
    testo: (dati.testo ?? "").trim(),
    opzioni: coppie.map((c) => c.testo),
    indiceCorretto: Math.max(0, coppie.findIndex((c) => c.corretta)),
    argomento: (dati.argomento ?? "").trim() || null,
    spiegazione: (dati.spiegazione ?? "").trim() || null,
  };
}

function rigaIniziale(candidato) {
  return {
    testo: candidato?.testo ?? "",
    opzioni: Array.isArray(candidato?.opzioni) && candidato.opzioni.length >= OPZIONI_MIN
      ? [...candidato.opzioni]
      : ["", ""],
    indiceCorretto: Number.isInteger(candidato?.indiceCorretto) ? candidato.indiceCorretto : 0,
    spiegazione: candidato?.spiegazione ?? "",
    argomento: candidato?.argomento ?? "",
  };
}

export default function RevisioneQuesiti({
  quesiti,
  materia,
  autoreId,
  fonte,
  onSalvato,
  onChiudi,
}) {
  const [righe, setRighe] = useState(() =>
    quesiti.map((q, i) => ({
      chiave: i,
      dati: rigaIniziale(q),
      stato: "in-attesa", // "in-attesa" | "salvato" | "scartato"
    })),
  );
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(null); // chiave della riga in salvataggio
  const [erroreSalvataggio, setErroreSalvataggio] = useState(null);

  function aggiornaDati(chiave, patch) {
    setRighe((prec) =>
      prec.map((r) => (r.chiave === chiave ? { ...r, dati: { ...r.dati, ...patch } } : r)),
    );
  }

  function setOpzione(chiave, indice, valore) {
    setRighe((prec) =>
      prec.map((r) =>
        r.chiave === chiave
          ? { ...r, dati: { ...r.dati, opzioni: r.dati.opzioni.map((o, i) => (i === indice ? valore : o)) } }
          : r,
      ),
    );
  }

  function aggiungiOpzione(chiave) {
    setRighe((prec) =>
      prec.map((r) =>
        r.chiave === chiave && r.dati.opzioni.length < OPZIONI_MAX
          ? { ...r, dati: { ...r.dati, opzioni: [...r.dati.opzioni, ""] } }
          : r,
      ),
    );
  }

  function rimuoviOpzione(chiave, indice) {
    setRighe((prec) =>
      prec.map((r) => {
        if (r.chiave !== chiave || r.dati.opzioni.length <= OPZIONI_MIN) return r;
        const opzioni = r.dati.opzioni.filter((_, i) => i !== indice);
        let indiceCorretto = r.dati.indiceCorretto;
        if (indice === indiceCorretto) indiceCorretto = 0;
        else if (indice < indiceCorretto) indiceCorretto -= 1;
        return { ...r, dati: { ...r.dati, opzioni, indiceCorretto } };
      }),
    );
  }

  async function accetta(riga, contenuto) {
    if (riga.stato !== "in-attesa" || salvataggioInCorso) return;
    setSalvataggioInCorso(riga.chiave);
    setErroreSalvataggio(null);
    try {
      const id = await creaQuesito({ ...contenuto, materia, autoreId, fonte });
      setRighe((prec) => prec.map((r) => (r.chiave === riga.chiave ? { ...r, stato: "salvato" } : r)));
      onSalvato?.(id);
    } catch (err) {
      setErroreSalvataggio("Salvataggio non riuscito. Riprova.");
      console.error(err);
    } finally {
      setSalvataggioInCorso(null);
    }
  }

  function scarta(chiave) {
    setRighe((prec) => prec.map((r) => (r.chiave === chiave ? { ...r, stato: "scartato" } : r)));
  }

  function ripristina(chiave) {
    setRighe((prec) => prec.map((r) => (r.chiave === chiave ? { ...r, stato: "in-attesa" } : r)));
  }

  const righeConValidazione = useMemo(
    () =>
      righe.map((r) => {
        const contenuto = contenutoRiga(r.dati);
        const { valido, errori } = validaQuesitoCandidato(contenuto);
        return { ...r, contenuto, valido, errori };
      }),
    [righe],
  );

  const daRivedere = righeConValidazione.filter((r) => r.stato === "in-attesa");
  const validePendenti = daRivedere.filter((r) => r.valido);
  const salvate = righeConValidazione.filter((r) => r.stato === "salvato").length;
  const scartate = righeConValidazione.filter((r) => r.stato === "scartato").length;

  async function accettaTuttiIValidi() {
    for (const r of validePendenti) {
      // Sequenziale: `salvataggioInCorso` blocca sovrapposizioni e ogni riga
      // aggiorna il proprio stato prima di passare alla successiva.
      // eslint-disable-next-line no-await-in-loop
      await accetta(r, r.contenuto);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-bordo bg-superficie p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Revisiona i quesiti proposti</h2>
          <p className="mt-0.5 text-xs text-inchiostro/50">
            Materia: {materia || "—"} · {salvate} salvati, {daRivedere.length} da rivedere
            {scartate > 0 && `, ${scartate} scartati`}
          </p>
        </div>
        <div className="flex gap-2">
          {validePendenti.length > 0 && (
            <button
              type="button"
              className={BOTTONE_SECONDARIO}
              onClick={accettaTuttiIValidi}
              disabled={salvataggioInCorso !== null}
            >
              Accetta tutti i validi ({validePendenti.length})
            </button>
          )}
          <button type="button" className={BOTTONE_SECONDARIO} onClick={onChiudi}>
            Chiudi
          </button>
        </div>
      </div>

      {erroreSalvataggio && (
        <div className="rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {erroreSalvataggio}
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {righeConValidazione.map((r) => {
          const bloccata = r.stato !== "in-attesa";
          return (
            <li
              key={r.chiave}
              className={`rounded-lg border border-bordo p-3 ${bloccata ? "opacity-60" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-inchiostro/50">
                  Quesito {r.chiave + 1}
                  {r.stato === "salvato" && " · salvato in banca"}
                  {r.stato === "scartato" && " · scartato"}
                </span>
                {r.stato === "scartato" && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primario"
                    onClick={() => ripristina(r.chiave)}
                  >
                    Ripristina
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <textarea
                  className={`${CAMPO} resize-y`}
                  rows={2}
                  value={r.dati.testo}
                  disabled={bloccata}
                  onChange={(e) => aggiornaDati(r.chiave, { testo: e.target.value })}
                />

                <div className="flex flex-col gap-1.5">
                  {r.dati.opzioni.map((opzione, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`corretta-${r.chiave}`}
                        className="accent-primario"
                        checked={r.dati.indiceCorretto === i}
                        disabled={bloccata}
                        onChange={() => aggiornaDati(r.chiave, { indiceCorretto: i })}
                        aria-label={`Opzione ${i + 1} corretta`}
                      />
                      <input
                        className={CAMPO}
                        value={opzione}
                        disabled={bloccata}
                        onChange={(e) => setOpzione(r.chiave, i, e.target.value)}
                        placeholder={`Opzione ${i + 1}`}
                      />
                      <button
                        type="button"
                        className="px-1 text-lg leading-none text-inchiostro/40 hover:text-errore disabled:opacity-30"
                        onClick={() => rimuoviOpzione(r.chiave, i)}
                        disabled={bloccata || r.dati.opzioni.length <= OPZIONI_MIN}
                        aria-label={`Rimuovi opzione ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="self-start text-xs font-medium text-primario disabled:opacity-40"
                    onClick={() => aggiungiOpzione(r.chiave)}
                    disabled={bloccata || r.dati.opzioni.length >= OPZIONI_MAX}
                  >
                    + Aggiungi opzione
                  </button>
                </div>

                <input
                  className={CAMPO}
                  value={r.dati.argomento}
                  disabled={bloccata}
                  onChange={(e) => aggiornaDati(r.chiave, { argomento: e.target.value })}
                  placeholder="Argomento (opzionale)"
                />

                <textarea
                  className={`${CAMPO} resize-y`}
                  rows={2}
                  value={r.dati.spiegazione}
                  disabled={bloccata}
                  onChange={(e) => aggiornaDati(r.chiave, { spiegazione: e.target.value })}
                  placeholder="Spiegazione (obbligatoria)"
                />

                {!r.valido && r.stato === "in-attesa" && (
                  <ul className="list-inside list-disc text-xs text-errore">
                    {r.errori.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}

                {r.stato === "in-attesa" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={BOTTONE_PRIMARIO}
                      disabled={!r.valido || salvataggioInCorso !== null}
                      onClick={() => accetta(r, r.contenuto)}
                    >
                      {salvataggioInCorso === r.chiave ? "Salvataggio…" : "Accetta"}
                    </button>
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      disabled={salvataggioInCorso !== null}
                      onClick={() => scarta(r.chiave)}
                    >
                      Scarta
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
