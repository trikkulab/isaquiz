// Guscio applicativo condiviso da tutte le aree (studente / docente / admin):
// header con navigazione a due livelli, contenuto della pagina in <Outlet>,
// footer. Montato come route di layout in App.jsx (un gruppo di route per area,
// con la propria guardia RichiediAuth) — le singole pagine non ripetono più
// header/footer né il bottone "Esci".
//
//  - Livello 1 (AREE): le aree a cui l'utente ha accesso. Studente è sempre
//    presente; Docente se isDocente; Admin se isAdmin. Con una sola area le
//    tab spariscono. Vedi DECISIONI_DESIGN.md, "Navigazione e layout".
//  - Livello 2 (pagine): le pagine dell'area attiva (dedotta dal path).
//
// Sopra i 640px (sm) le due barre stanno in alto; sotto, diventano un menù
// laterale (drawer) aperto dall'icona ☰.

import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { nomeVisibile } from "../../../data/utentiRepository.js";
import { AREE, areaHome } from "../config/navigazione.js";
import PiePagina from "./PiePagina.jsx";

function areeAccessibili(isDocente, isAdmin) {
  return AREE.filter(
    (a) =>
      a.id === "studente" ||
      (a.id === "docente" && isDocente) ||
      (a.id === "admin" && isAdmin),
  );
}

function areaAttiva(pathname, aree) {
  return (
    aree.find((a) => pathname === a.base || pathname.startsWith(a.base + "/")) ||
    aree[0]
  );
}

const vocePagina = ({ isActive }) =>
  `rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
    isActive
      ? "bg-sfondo text-inchiostro ring-1 ring-inset ring-bordo"
      : "text-inchiostro/55 hover:text-inchiostro"
  }`;

export default function AppLayout() {
  const { utente, isDocente, isAdmin, esci } = useAuth();
  const { pathname } = useLocation();
  const [menuAperto, setMenuAperto] = useState(false);

  const aree = areeAccessibili(isDocente, isAdmin);
  const attiva = areaAttiva(pathname, aree);
  const nome = nomeVisibile(utente) || utente.nickname || utente.email;

  const chiudi = () => setMenuAperto(false);

  const tabArea = (a) => (
    <NavLink
      key={a.id}
      to={a.base === "/admin" ? "/admin/corsi" : a.base}
      end={a.base !== "/admin"}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
          isActive || a.id === attiva.id
            ? "bg-primario/10 text-primario"
            : "text-inchiostro/55 hover:text-inchiostro"
        }`
      }
      onClick={chiudi}
    >
      {a.label}
    </NavLink>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* riga 1 — marchio, aree, utente */}
      <header className="border-b border-bordo bg-superficie">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-bordo text-lg leading-none sm:hidden"
            aria-label="Apri il menù"
            aria-expanded={menuAperto}
            onClick={() => setMenuAperto(true)}
          >
            ☰
          </button>

          <NavLink
            to={areaHome({ isDocente, isAdmin })}
            className="font-titoli text-lg font-bold text-primario"
          >
            isaquiz
          </NavLink>

          {aree.length > 1 && (
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Aree">
              {aree.map(tabArea)}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-[16ch] truncate text-xs text-inchiostro/55 sm:inline">
              {nome}
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

      {/* riga 2 — pagine dell'area attiva */}
      <nav
        className="hidden border-b border-bordo bg-superficie sm:block"
        aria-label={`Pagine — ${attiva.label}`}
      >
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-1.5">
          {attiva.pagine.map((p) => (
            <NavLink key={p.to} to={p.to} end={p.end} className={vocePagina} onClick={chiudi}>
              {p.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <PiePagina />

      {/* drawer (menù laterale) — solo sotto sm */}
      {menuAperto && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0 bg-inchiostro/40"
            onClick={chiudi}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(80%,290px)] flex-col gap-1 overflow-y-auto border-r border-bordo bg-superficie p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-titoli text-base font-bold text-primario">isaquiz</span>
              <button
                type="button"
                onClick={chiudi}
                className="grid h-8 w-8 place-items-center text-lg text-inchiostro/55"
                aria-label="Chiudi il menù"
              >
                ✕
              </button>
            </div>
            {aree.map((a) => (
              <div key={a.id} className="mt-3">
                <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-inchiostro/45">
                  {a.label}
                </p>
                {a.pagine.map((p) => (
                  <NavLink
                    key={p.to}
                    to={p.to}
                    end={p.end}
                    onClick={chiudi}
                    className={({ isActive }) =>
                      `block rounded-lg px-2.5 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-primario/10 text-primario"
                          : "text-inchiostro/80 hover:text-inchiostro"
                      }`
                    }
                  >
                    {p.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
