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

// Area di atterraggio dopo il login, in base al campo `ruolo` (cache di comodo:
// admin > docente > studente). Usata da Indirizza (route "/") e da Accedi.
export function areaHome(ruolo) {
  if (ruolo === "admin") return "/admin/corsi";
  if (ruolo === "docente") return "/docente";
  return "/studente";
}
