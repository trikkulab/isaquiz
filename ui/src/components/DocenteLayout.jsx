// Guscio condiviso delle pagine docente (route /docente/*): header con
// navigazione + identità/uscita, contenuto della pagina in <Outlet>, footer.
// Montato una volta sola come route di layout in App.jsx — le singole pagine
// non ripetono più header/footer né il bottone "Esci".
//
// Stile "docente": sobrio e funzionale, priorità a leggibilità (CLAUDE.md,
// "Schermate docente e statistiche").

import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { nomeVisibile } from "../../../data/utentiRepository.js";
import PiePagina from "./PiePagina.jsx";

const VOCI = [
  { to: "/docente", label: "I miei quiz", end: true },
  { to: "/docente/corsi", label: "Corsi", end: false },
];

function classiVoce({ isActive }) {
  return `rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-primario/10 text-primario"
      : "text-inchiostro/60 hover:text-inchiostro"
  }`;
}

export default function DocenteLayout() {
  const { utente, esci } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-bordo bg-superficie">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <NavLink to="/docente" end className="font-titoli text-lg font-bold text-primario">
            isaquiz
          </NavLink>
          <nav className="flex items-center gap-1">
            {VOCI.map((v) => (
              <NavLink key={v.to} to={v.to} end={v.end} className={classiVoce}>
                {v.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-inchiostro/55 sm:inline">
              {nomeVisibile(utente) || utente.email}
            </span>
            <button
              type="button"
              onClick={esci}
              className="text-xs font-medium text-inchiostro/55 hover:text-inchiostro"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <PiePagina />
    </div>
  );
}
