// Tab di filtro per la pagina statistiche: "Anno" (aggregato su tutti i corsi)
// oppure un CORSO specifico (vedi DECISIONI_DESIGN.md, "Statistiche
// studente"). Una tab per corso, non per materia: due corsi diversi con la
// stessa materia restano due tab distinte, altrimenti lo studente non
// saprebbe a quale dei due (quindi quale docente) si riferisce. La materia
// resta l'etichetta principale (protagonista); il docente è un sotto-testo
// più piccolo e discreto sotto, solo per disambiguare — non è mai l'unico
// elemento della tab. Il colore non porta informazione qui — è solo
// evidenza dello stato attivo (vedi DECISIONI_DESIGN.md, "Sistema colore").
//
// Si nasconde solo se non c'è NESSUN corso (niente da filtrare). Con un solo
// corso "Anno" e quella tab danno la stessa lista di argomenti, ma le tab
// restano comunque visibili: sono l'unico punto in cui compaiono materia e
// docente, quindi nascondersi anche qui lascerebbe la pagina senza alcuna
// indicazione di quale corso si sta guardando — capita spesso selezionando
// un anno scolastico passato con un solo corso (vedi SelettoreAnno.jsx):
// prima si nascondeva anche "Anno" insieme alla tab, sembrando un guasto.

export default function FiltroMaterie({ corsi, selezione, onSelezione }) {
  if (!corsi || corsi.length === 0) return null;

  const tab = (valore, materia, docente, chiave) => {
    const attiva = selezione === valore;
    return (
      <button
        key={chiave}
        type="button"
        onClick={() => onSelezione(valore)}
        aria-pressed={attiva}
        className={`flex flex-col items-start gap-0 rounded-lg px-3 py-1.5 text-left transition-colors ${
          attiva
            ? "bg-primario/10 text-primario"
            : "text-inchiostro/55 hover:text-inchiostro"
        }`}
      >
        <span className="text-sm font-semibold">{materia}</span>
        {docente && (
          <span className={`text-[11px] ${attiva ? "text-primario/70" : "text-inchiostro/40"}`}>
            {docente}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-start gap-1" aria-label="Filtra per corso">
      {tab(null, "Anno", null, "anno")}
      {corsi.map((c) => tab(c.corsoId, c.materia, c.docente, c.corsoId))}
    </div>
  );
}
