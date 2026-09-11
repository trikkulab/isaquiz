// Punteggio CONTESTUALE ("3 / 4 su questo argomento" o su un singolo quiz),
// mai il totale del quiz — vedi DECISIONI_DESIGN.md, "Statistiche studente" e
// CLAUDE.md ("Punteggio nelle liste è sempre contestuale"). Usato nella pagina
// statistiche sia sulla riga argomento sia sulle righe quiz del drill-down.
//
// Il testo "c / t" è il segnale primario; la barra è solo un rinforzo visivo
// (nessun colore che porti informazione da solo).

export default function PunteggioContestuale({ corrette, totali, className = "" }) {
  const frazione = totali > 0 ? corrette / totali : 0;

  return (
    <span className={`flex shrink-0 items-center gap-2 ${className}`}>
      <span
        className="h-1.5 w-12 overflow-hidden rounded-full bg-bordo"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-full bg-primario"
          style={{ width: `${Math.round(frazione * 100)}%` }}
        />
      </span>
      <span className="tabular-nums text-sm font-semibold text-inchiostro/75">
        {corrette} / {totali}
      </span>
    </span>
  );
}
