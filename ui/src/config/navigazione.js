// Struttura della navigazione del guscio applicativo (AppLayout): le tre AREE
// e, per ciascuna, le pagine di primo livello mostrate nella sotto-barra.
//
// Le aree sono INDIPENDENTI, non una gerarchia (vedi DECISIONI_DESIGN.md,
// "Navigazione e layout"):
//  - studente: sempre visibile a un utente autenticato;
//  - docente:  se isDocente (email in config/current.docentiAutorizzati);
//  - admin:    se isAdmin (UTENTE.ruolo === 'admin', solo da console).
//
// `base` è il prefisso di path che identifica l'area attiva dal location
// corrente (match più lungo). `end` su una pagina = match esatto per lo stato
// attivo del NavLink (necessario quando un'altra pagina dell'area ha un path
// che la contiene come prefisso).

export const AREE = [
  {
    id: "studente",
    label: "Studente",
    base: "/studente",
    pagine: [
      { to: "/studente", label: "Partecipa", end: true },
      { to: "/studente/statistiche", label: "Le mie statistiche" },
    ],
  },
  {
    id: "docente",
    label: "Docente",
    base: "/docente",
    pagine: [
      { to: "/docente", label: "I miei quiz", end: true },
      { to: "/docente/corsi", label: "Corsi" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    base: "/admin",
    pagine: [
      { to: "/admin/corsi", label: "Corsi dell'istituto" },
      { to: "/admin/docenti", label: "Docenti autorizzati" },
      { to: "/admin/impostazioni", label: "Impostazioni" },
    ],
  },
];

// Area di atterraggio dopo il login, dalle capability (priorità admin > docente
// > studente). Usata da Indirizza (route "/"), Accedi e dal wordmark di
// AppLayout. Non legge un campo memorizzato: `isDocente`/`isAdmin` arrivano dal
// contesto auth (calcolati nel provisioning).
export function areaHome({ isDocente = false, isAdmin = false } = {}) {
  if (isAdmin) return "/admin/corsi";
  if (isDocente) return "/docente";
  return "/studente";
}
