// Route "/" — smista in base allo stato di autenticazione:
//  - auth in caricamento -> schermata d'attesa;
//  - non autenticato     -> /accedi;
//  - autenticato         -> dashboard del ruolo (docente/studente).
//
// Stessa logica di destinazione già in Accedi.jsx dopo il login: qui serve per
// chi arriva sulla radice (link, bookmark, digitazione manuale).

import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { areaHome } from "../config/navigazione.js";

export default function Indirizza() {
  const { utente, caricamento } = useAuth();

  if (caricamento) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-inchiostro/60">
        Un momento…
      </div>
    );
  }

  if (!utente) return <Navigate to="/accedi" replace />;

  return <Navigate to={areaHome(utente.ruolo)} replace />;
}
