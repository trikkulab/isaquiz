// Overlay che monta la correzione di un quiz sopra la pagina statistiche
// (usato sotto la soglia desktop, da AccordionArgomenti). NON è un "routed
// modal": nessuna sincronizzazione con l'URL (troppa complessità per il
// beneficio — vedi DECISIONI_DESIGN.md, "Statistiche studente"). Per condividere
// il link o vedere la correzione a schermo intero c'è il bottone esplicito
// "Apri come pagina", che naviga a /quiz/:quizId/risultati.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import CorrezioneQuiz from "./CorrezioneQuiz.jsx";

export default function ModaleCorrezione({ quizId, studenteId, onChiudi }) {
  const navigate = useNavigate();

  useEffect(() => {
    const onTasto = (e) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", onTasto);
    const overflowPrec = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onTasto);
      document.body.style.overflow = overflowPrec;
    };
  }, [onChiudi]);

  return (
    <div
      className="fixed inset-0 z-50 flex bg-inchiostro/40"
      onClick={onChiudi}
      role="dialog"
      aria-modal="true"
      aria-label="Correzione del quiz"
    >
      <div
        className="mx-auto mt-auto flex h-[92vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[22px] bg-sfondo shadow-morbida sm:my-auto sm:h-[88vh] sm:rounded-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bordo bg-superficie px-4 py-3">
          <button
            type="button"
            onClick={onChiudi}
            className="text-sm font-medium text-inchiostro/60 hover:text-inchiostro"
          >
            ✕ Chiudi
          </button>
          <button
            type="button"
            onClick={() => navigate(`/quiz/${quizId}/risultati`)}
            className="text-sm font-semibold text-primario"
          >
            Apri come pagina →
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CorrezioneQuiz quizId={quizId} studenteId={studenteId} />
        </div>
      </div>
    </div>
  );
}
