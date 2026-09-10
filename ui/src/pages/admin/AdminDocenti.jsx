// Admin — docenti autorizzati (route /admin/docenti). Elenco delle email in
// config/current.docentiAutorizzati: chi vi compare, al login, ottiene l'area
// Docente.
//
// SOLA LETTURA in questa fase: aggiungere/togliere un'email si fa da console
// Firebase. La scrittura dalla UI richiederebbe una regola su `config` legata
// al ruolo admin — rimandata (vedi DECISIONI_DESIGN.md, "Amministratore").

import { useEffect, useState } from "react";

import { getDocentiAutorizzati } from "../../../../data/configRepository.js";

export default function AdminDocenti() {
  const [email, setEmail] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    let attivo = true;
    getDocentiAutorizzati()
      .then((l) => attivo && setEmail(l))
      .catch((err) => {
        if (attivo) setErrore("Impossibile caricare l'elenco.");
        console.error(err);
      })
      .finally(() => attivo && setCaricamento(false));
    return () => {
      attivo = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">Docenti autorizzati</h1>
      <p className="mb-5 text-sm text-inchiostro/55">
        {email.length} {email.length === 1 ? "email" : "email"} · sola lettura
      </p>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
        </div>
      )}

      {caricamento ? (
        <p className="text-sm text-inchiostro/60">Caricamento…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {email.map((e) => (
            <li
              key={e}
              className="rounded-lg border border-bordo bg-superficie px-3 py-2 font-mono text-sm"
            >
              {e}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 rounded-lg border border-bordo bg-sfondo px-3 py-2 text-xs text-inchiostro/60">
        Per aggiungere o togliere un docente si modifica
        <span className="font-mono"> config/current.docentiAutorizzati </span>
        dalla console Firebase (vedi <span className="font-mono">docs/deploy.md</span>,
        «Autorizzare un nuovo docente»). L'effetto è dal login successivo della
        persona.
      </p>
    </div>
  );
}
