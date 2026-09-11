// Riga di identità dello studente (avatar, nickname, classe, livello) — lo
// stesso linguaggio visivo (avatar a cerchio, badge livello a stella,
// riga racchiusa in una barra) in due varianti di colore, pensate per
// convergere sulla STESSA tonalità percepita pur partendo da fondi
// opposti (stesso principio del badge livello: un velo chiaro sopra lo
// scuro, uno di primario sopra il chiaro):
//   - "scura": velo bianco sul gradiente primario (usata da BarraQuiz, in
//     testa al quiz e ai risultati).
//   - "chiara": velo primario sul fondo chiaro (usata da StudenteHome e
//     StatisticheStudente).
// Così l'identità resta visibile e coerente in tutta l'area studente, non
// solo durante lo svolgimento. Vedi CLAUDE.md, "Schermate studente".

export default function IdentitaStudente({ studente, variante }) {
  const iniziali = (studente.nickname || studente.nome || "?")
    .slice(0, 1)
    .toUpperCase();
  const scura = variante === "scura";

  return (
    <div
      className={
        "flex items-center gap-2.5 rounded-2xl px-4 py-3 " +
        (scura ? "bg-su-primario/[0.14]" : "bg-primario/[0.22]")
      }
    >
      <span
        className={
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-titoli text-xl font-bold " +
          (scura ? "bg-su-primario/20 text-su-primario" : "bg-primario text-su-primario")
        }
        aria-hidden="true"
      >
        {studente.avatarEmoji || iniziali}
      </span>

      <div className="flex flex-col leading-tight">
        <span
          className={
            "font-titoli text-[15px] font-semibold " +
            (scura ? "text-su-primario" : "text-inchiostro")
          }
        >
          {studente.nickname || studente.nome}
        </span>
        <span className={"text-xs " + (scura ? "text-su-primario/80" : "text-inchiostro/55")}>
          {studente.classeId}
        </span>
      </div>

      {studente.livello != null && (
        <span
          className={
            "ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold " +
            (scura ? "bg-su-primario/30 text-su-primario" : "bg-superficie text-primario shadow-sm")
          }
          title="Il tuo livello"
        >
          <span aria-hidden="true">⭐</span>
          Lv. {studente.livello}
        </span>
      )}
    </div>
  );
}
