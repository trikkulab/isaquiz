import { Routes, Route } from "react-router-dom";

import DocenteHome from "./pages/DocenteHome.jsx";
import CreaQuiz from "./pages/CreaQuiz.jsx";
import RisultatiDocente from "./pages/RisultatiDocente.jsx";
import StudenteHome from "./pages/StudenteHome.jsx";
import QuizStudente from "./pages/QuizStudente.jsx";
import QuizRisultatiPagina from "./pages/QuizRisultatiPagina.jsx";
import StatisticheStudente from "./pages/StatisticheStudente.jsx";

// TODO: quando si aggiunge il login vero (Fase 2), avvolgere le route /docente/*
// in un layout condiviso (header, eventuale menu) — vedi discussione su DocenteLayout.
// Per ora nessun layout: si parte dal flusso più semplice possibile.

export default function App() {
  return (
    <Routes>
      <Route path="/docente" element={<DocenteHome />} />
      <Route path="/docente/crea-quiz" element={<CreaQuiz />} />
      <Route path="/docente/crea-quiz/:quizId" element={<CreaQuiz />} />
      <Route path="/docente/quiz/:quizId/risultati" element={<RisultatiDocente />} />

      <Route path="/studente" element={<StudenteHome />} />
      <Route path="/quiz/:quizId" element={<QuizStudente />} />
      <Route path="/quiz/:quizId/risultati" element={<QuizRisultatiPagina />} />

      <Route path="/studente/statistiche" element={<StatisticheStudente />} />
    </Routes>
  );
}
