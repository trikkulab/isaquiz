// Pagina di accesso (route /accedi). Unico modo per entrare: account Google
// istituzionale. Dopo il login:
//  - se c'è ?next= (impostato da RichiediAuth) -> torna lì;
//  - altrimenti dashboard per ruolo (docente -> /docente, studente -> /studente).
//
// Il ruolo docente dipende solo da CONFIG.docentiAutorizzati (ricontrollato a
// ogni login in data/authProvider.js): nessun flusso "diventa docente" qui.

import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { ErroreDominio } from "../../../data/authProvider.js";

export default function Accedi() {
  const { utente, caricamento, accedi } = useAuth();
  const [params] = useSearchParams();
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  const next = params.get("next");

  if (!caricamento && utente) {
    const dest = next || (utente.ruolo === "docente" ? "/docente" : "/studente");
    return <Navigate to={dest} replace />;
  }

  async function entra() {
    setInCorso(true);
    setErrore(null);
    try {
      await accedi();
      // onAuthStateChanged aggiorna il contesto: scatta il <Navigate> sopra.
    } catch (err) {
      if (err instanceof ErroreDominio) {
        setErrore(err.message);
      } else if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        // l'utente ha chiuso il popup: nessun messaggio d'errore
      } else {
        console.error(err);
        setErrore("Accesso non riuscito. Riprova.");
      }
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <p className="font-titoli text-3xl font-bold text-primario">isaquiz</p>
        <p className="mt-2 text-sm text-inchiostro/65">
          Accedi con il tuo account della scuola per continuare.
        </p>
      </div>

      <button
        type="button"
        onClick={entra}
        disabled={inCorso || caricamento}
        className="rounded-xl bg-primario px-6 py-3 font-titoli text-base font-bold text-su-primario shadow-morbida transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {inCorso ? "Attendi…" : "Accedi con Google"}
      </button>

      {errore && (
        <p className="rounded-xl bg-errore-sfondo px-4 py-3 text-sm font-medium text-errore">
          {errore}
        </p>
      )}
    </div>
  );
}
