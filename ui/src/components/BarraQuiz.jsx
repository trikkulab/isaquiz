// Header minimale per QuizStudente: identifica a colpo d'occhio CHI sta facendo
// il quiz (avatar, nickname, classe) e QUALE quiz sta facendo (titolo, materia,
// docente), più un accenno al livello (solo display, nessuna logica di
// gamification: quella è Fase 4) e l'avanzamento tra i quesiti.
//
// La barra di avanzamento è a segmenti (stile "storie"): un segmento per
// quesito, pieno = già risposto, evidenziato = quello corrente.

export default function BarraQuiz({ studente, quiz, corrente, totale }) {
  const iniziali = (studente.nickname || studente.nome || "?")
    .slice(0, 1)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 rounded-b-[22px] bg-gradient-to-br from-primario to-primario-scuro px-5 pt-4 pb-3.5 text-white shadow-morbida">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-titoli text-xl font-bold"
            aria-hidden="true"
          >
            {studente.avatarEmoji || iniziali}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-titoli text-[15px] font-semibold">
              {studente.nickname || studente.nome}
            </span>
            <span className="text-xs opacity-80">{studente.classeId}</span>
          </div>
        </div>

        {studente.livello != null && (
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/[0.18] px-3 py-1.5 text-[13px] font-semibold"
            title="Il tuo livello"
          >
            <span aria-hidden="true">⭐</span>
            Lv. {studente.livello}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col items-start gap-0.5">
        <span className="font-titoli text-[17px] font-bold">{quiz.titolo}</span>
        {[quiz.materia, quiz.docente].some(Boolean) && (
          <span className="text-[13px] opacity-85">
            {[quiz.materia, quiz.docente].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      <div
        className="mt-3.5 flex gap-1"
        role="progressbar"
        aria-valuenow={corrente}
        aria-valuemin={1}
        aria-valuemax={totale}
      >
        {Array.from({ length: totale }).map((_, indice) => {
          const stato =
            indice < corrente - 1 ? "completato" : indice === corrente - 1 ? "attivo" : "futuro";
          return (
            <span
              key={indice}
              className={
                "h-[5px] flex-1 rounded-full transition-colors duration-300 " +
                (stato === "completato"
                  ? "bg-white"
                  : stato === "attivo"
                  ? "bg-gradient-to-r from-white to-white/50"
                  : "bg-white/25")
              }
            />
          );
        })}
      </div>
      <span className="mt-1.5 block text-right text-[11px] opacity-75">
        Domanda {corrente} di {totale}
      </span>
    </header>
  );
}
