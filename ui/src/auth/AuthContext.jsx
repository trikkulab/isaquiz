// Contesto di autenticazione: unico punto in cui la UI si sottoscrive
// all'utente corrente reale (Firebase Auth, via data/authProvider.js). Le
// pagine leggono l'utente con useUtenteCorrente(); le route sono protette da
// <RichiediAuth>.
//
// Sostituisce il vecchio data/mockAuth.js (getUtenteCorrente sincrona).

import { createContext, useContext, useEffect, useState } from "react";

import { ascoltaUtenteCorrente, accediConGoogle, esci } from "../../../data/authProvider.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    // ascoltaUtenteCorrente ritorna l'unsubscribe di onAuthStateChanged.
    return ascoltaUtenteCorrente((u) => {
      setUtente(u);
      setCaricamento(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ utente, caricamento, accedi: accediConGoogle, esci }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() usato fuori da <AuthProvider>.");
  return ctx;
}

// Scorciatoia per le pagine montate dietro <RichiediAuth>: lì l'utente è
// sempre non-null (la guardia ha già gestito loading e redirect).
export function useUtenteCorrente() {
  return useAuth().utente;
}
