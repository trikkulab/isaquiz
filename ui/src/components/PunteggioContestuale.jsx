// Punteggio CONTESTUALE ("3 / 4 su questo argomento" o su un singolo quiz),
// mai il totale del quiz — vedi DECISIONI_DESIGN.md, "Statistiche studente" e
// CLAUDE.md ("Punteggio nelle liste è sempre contestuale"). Usato nella pagina
// statistiche sia sulla riga argomento sia sulle righe quiz del drill-down.
//
// Il testo "c / t" è il segnale primario. Senza `livello` la barra resta un
// rinforzo visivo neutro (nessun colore che porti informazione da solo) — il
// caso delle righe-quiz singolo, che non sono "padronanza". Con `livello`
// (solo righe-argomento aggregate, vedi utils/colori.js) la barra prende il
// colore-stato della padronanza e un'etichetta testuale lo affianca: il
// colore non è mai l'unico segnale.

const CLASSI_BARRA = {
  bassa: "bg-padronanza-bassa",
  media: "bg-padronanza-media",
  alta: "bg-padronanza-alta",
};

const CLASSI_ETICHETTA = {
  bassa: "text-padronanza-bassa",
  media: "text-padronanza-media",
  alta: "text-padronanza-alta",
};

export default function PunteggioContestuale({
  corrette,
  totali,
  livello = null,
  className = "",
}) {
  const frazione = totali > 0 ? corrette / totali : 0;

  return (
    <span className={`flex shrink-0 items-center gap-2 ${className}`}>
      <span
        className="h-1.5 w-12 overflow-hidden rounded-full bg-bordo"
        aria-hidden="true"
      >
        <span
          className={`block h-full rounded-full ${
            livello ? CLASSI_BARRA[livello] : "bg-primario"
          }`}
          style={{ width: `${Math.round(frazione * 100)}%` }}
        />
      </span>
      <span className="tabular-nums text-sm font-semibold text-inchiostro/75">
        {corrette} / {totali}
      </span>
      {livello && (
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide ${CLASSI_ETICHETTA[livello]}`}
        >
          {livello}
        </span>
      )}
    </span>
  );
}
