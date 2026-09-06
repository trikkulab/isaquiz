// Contenitore "pagina intera" per QuizRisultati — monta la route
// /quiz/:quizId/risultati. Unico scopo: decidere il layout di questo
// contesto specifico (qui: aggiungere il credito tecnico in fondo) senza
// che QuizRisultati.jsx debba sapere di essere una pagina intera — resta
// "contenuto puro", riusabile anche dentro ModaleCorrezione/PannelloArgomenti
// (Fase 4/5) senza il credito, che ha senso solo qui.

import QuizRisultati from "./QuizRisultati.jsx";
import CreditoTecnico from "../components/CreditoTecnico.jsx";

export default function QuizRisultatiPagina() {
  return (
    <div>
      <QuizRisultati />
      <CreditoTecnico />
    </div>
  );
}
