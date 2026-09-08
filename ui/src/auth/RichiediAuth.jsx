// Guardia di route. Avvolge gli elementi delle route protette in App.jsx:
//  - mentre l'auth carica -> schermata d'attesa;
//  - utente non autenticato -> redirect a /accedi?next=<destinazione>;
//  - `ruolo` richiesto e non combaciante -> accesso negato.
//
// Nota UX: anche lo studente che apre un link/QR di un quiz passa da qui, quindi
// da /accedi se non ha sessione. È voluto: le security rules legano la risposta
// a request.auth.uid e nessuno studente deve usare la piattaforma senza login
// vero (vedi DECISIONI_DESIGN.md, "Sviluppo").

import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext.jsx";

function Attesa() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-inchiostro/60">
      Un momento…
    </div>
  );
}

function AccessoNegato({ ruolo }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-titoli text-lg font-bold">Area riservata</p>
      <p className="text-sm text-inchiostro/70">
        {ruolo === "docente"
          ? "Questa sezione è riservata ai docenti."
          : "Non hai i permessi per accedere a questa pagina."}
      </p>
      <a href="#/studente" className="text-sm font-medium text-primario">
        Torna alla home
      </a>
    </div>
  );
}

export default function RichiediAuth({ ruolo, children }) {
  const { utente, caricamento } = useAuth();
  const location = useLocation();

  if (caricamento) return <Attesa />;

  if (!utente) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/accedi?next=${next}`} replace />;
  }

  if (ruolo && utente.ruolo !== ruolo) return <AccessoNegato ruolo={ruolo} />;

  return children;
}
