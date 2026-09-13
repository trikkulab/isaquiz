// Admin — corsi dell'istituto (route /admin/corsi). Vista d'insieme: utile a
// individuare doppioni di denominazione della materia, con l'unica azione di
// scrittura concessa all'admin in questa fase — disattivare/riattivare un
// corso (mai cancellarlo: vedi impostaAttivoCorso). Non è la vista
// coordinatore cross-materia soggetta a DPIA (vedi CLAUDE.md).

import { useEffect, useState } from "react";

import { getTuttiICorsi, impostaAttivoCorso } from "../../../../data/corsiRepository.js";

export default function AdminCorsi() {
  const [corsi, setCorsi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [inAttesa, setInAttesa] = useState(null); // id del corso in fase di toggle

  useEffect(() => {
    let vivo = true;
    ricarica(() => vivo);
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ricarica(ancoraVivo = () => true) {
    setCaricamento(true);
    return getTuttiICorsi()
      .then((c) => ancoraVivo() && setCorsi(c))
      .catch((err) => {
        if (ancoraVivo()) setErrore("Impossibile caricare i corsi.");
        console.error(err);
      })
      .finally(() => ancoraVivo() && setCaricamento(false));
  }

  async function toggleAttivo(corso) {
    setInAttesa(corso.id);
    setErrore(null);
    try {
      await impostaAttivoCorso(corso.id, corso.attivo === false);
      await ricarica();
    } catch (err) {
      setErrore("Operazione non riuscita.");
      console.error(err);
    } finally {
      setInAttesa(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">Corsi dell'istituto</h1>
      <p className="mb-5 text-sm text-inchiostro/55">
        {corsi.length} {corsi.length === 1 ? "corso" : "corsi"} · attiva/disattiva un doppione
      </p>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
        </div>
      )}

      {caricamento ? (
        <p className="text-sm text-inchiostro/60">Caricamento…</p>
      ) : corsi.length === 0 ? (
        <div className="rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
          Nessun corso creato.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-bordo">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="bg-superficie text-left text-xs uppercase tracking-wide text-inchiostro/55">
                <th className="px-3 py-2 font-semibold">Materia</th>
                <th className="px-3 py-2 font-semibold">Classe</th>
                <th className="px-3 py-2 font-semibold">Anno</th>
                <th className="px-3 py-2 font-semibold">Titolare</th>
                <th className="px-3 py-2 font-semibold">Codice</th>
                <th className="px-3 py-2 font-semibold">Stato</th>
                <th className="px-3 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {corsi.map((c) => {
                const disattivato = c.attivo === false;
                return (
                  <tr
                    key={c.id}
                    className={`border-t border-bordo bg-superficie ${disattivato ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-2 font-medium">{c.materia}</td>
                    <td className="px-3 py-2">{c.classeId}</td>
                    <td className="px-3 py-2 tabular-nums">{c.annoScolastico}</td>
                    <td className="px-3 py-2">{c.titolare || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.codiceAccesso || "—"}</td>
                    <td className="px-3 py-2">{disattivato ? "disattivato" : "attivo"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-primario disabled:opacity-40"
                        onClick={() => toggleAttivo(c)}
                        disabled={inAttesa === c.id}
                      >
                        {inAttesa === c.id ? "…" : disattivato ? "Riattiva" : "Disattiva"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
