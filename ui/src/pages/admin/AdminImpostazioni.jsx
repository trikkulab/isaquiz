// Admin — impostazioni dell'istituto (route /admin/impostazioni). Lettura di
// config/current: identità dell'istituto e anno scolastico corrente. Sola
// lettura in questa fase (si modifica da console).

import { useEffect, useState } from "react";

import { getConfig } from "../../../../data/configRepository.js";

const CAMPI = [
  ["nomeIstituto", "Nome istituto"],
  ["dominioIstituzionale", "Dominio Google Workspace"],
  ["annoScolasticoCorrente", "Anno scolastico corrente"],
  ["codiceMeccanografico", "Codice meccanografico"],
];

export default function AdminImpostazioni() {
  const [config, setConfig] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    let attivo = true;
    getConfig()
      .then((c) => attivo && setConfig(c))
      .catch((err) => {
        if (attivo) setErrore("Impossibile caricare la configurazione.");
        console.error(err);
      })
      .finally(() => attivo && setCaricamento(false));
    return () => {
      attivo = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">Impostazioni istituto</h1>
      <p className="mb-5 text-sm text-inchiostro/55">Sola lettura — si modifica da console.</p>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
        </div>
      )}

      {caricamento ? (
        <p className="text-sm text-inchiostro/60">Caricamento…</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-xl border border-bordo bg-superficie p-4 text-sm">
          {CAMPI.map(([chiave, etichetta]) => (
            <div key={chiave} className="contents">
              <dt className="text-inchiostro/55">{etichetta}</dt>
              <dd className="font-medium">{config?.[chiave] || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
