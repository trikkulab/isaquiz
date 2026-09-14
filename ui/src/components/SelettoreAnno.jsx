// Filtro anno scolastico "in disparte" (vedi DECISIONI_DESIGN.md, "Cambio
// anno scolastico"): si lavora normalmente solo sull'anno corrente, quindi di
// default c'è solo una checkbox spenta "Mostra anni precedenti" — nessun
// combobox visibile finché non serve davvero. Accesa, rivela il combobox con
// gli anni per cui esistono dati, per sceglierne uno alla volta (mai un
// accumulo di più anni insieme). Pensato per essere riusato identico da più
// pagine (StatisticheStudente oggi; GestioneCorsi/DocenteHome quando si farà
// il decluttering delle loro liste).
//
// Si nasconde da solo se non c'è storico da vedere (un solo anno disponibile
// oltre a quello corrente) — stessa convenzione di FiltroMaterie.jsx.
//
// Componente controllato: chi lo usa possiede `mostraPrecedenti` e
// `annoSelezionato`, e ricalcola i propri dati filtrando per l'anno
// "effettivo" (annoSelezionato quando mostraPrecedenti è vero, altrimenti
// sempre annoCorrente) — nessuno stato o lettura qui dentro.

export default function SelettoreAnno({
  anni,
  annoCorrente,
  mostraPrecedenti,
  onMostraPrecedenti,
  annoSelezionato,
  onSelezionaAnno,
}) {
  const haStorico = anni.some((a) => a !== annoCorrente);
  if (!haStorico) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-inchiostro/60">
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          className="accent-primario"
          checked={mostraPrecedenti}
          onChange={(e) => onMostraPrecedenti(e.target.checked)}
        />
        Mostra anni precedenti
      </label>
      {mostraPrecedenti && (
        <select
          className="rounded-lg border border-bordo bg-superficie px-2 py-1 text-xs outline-none focus:border-primario"
          value={annoSelezionato ?? annoCorrente}
          onChange={(e) => onSelezionaAnno(e.target.value)}
          aria-label="Anno scolastico"
        >
          {anni.map((a) => (
            <option key={a} value={a}>
              {a === annoCorrente ? `${a} (corrente)` : a}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
