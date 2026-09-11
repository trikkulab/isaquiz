// Tab di filtro per la pagina statistiche: "Anno" (aggregato su tutte le
// materie) oppure una materia specifica. Il colore non porta informazione qui —
// è solo evidenza dello stato attivo (vedi DECISIONI_DESIGN.md, "Sistema colore").
//
// Con una sola materia le tab non aggiungono nulla ("Anno" e la materia danno
// la stessa lista): il componente non rende niente, come le tab di area in
// AppLayout quando l'utente ha una sola area.

export default function FiltroMaterie({ materie, selezione, onSelezione }) {
  if (!materie || materie.length <= 1) return null;

  const tab = (valore, etichetta) => {
    const attiva = selezione === valore;
    return (
      <button
        key={etichetta}
        type="button"
        onClick={() => onSelezione(valore)}
        aria-pressed={attiva}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
          attiva
            ? "bg-primario/10 text-primario"
            : "text-inchiostro/55 hover:text-inchiostro"
        }`}
      >
        {etichetta}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1" aria-label="Filtra per materia">
      {tab(null, "Anno")}
      {materie.map((m) => tab(m, m))}
    </div>
  );
}
