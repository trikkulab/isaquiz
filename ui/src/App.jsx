import { Routes, Route } from "react-router-dom";

import DocenteHome from "./pages/DocenteHome.jsx";
import CreaQuiz from "./pages/CreaQuiz.jsx";
import RisultatiDocente from "./pages/RisultatiDocente.jsx";
import StudenteHome from "./pages/StudenteHome.jsx";
import QuizStudente from "./pages/QuizStudente.jsx";
import QuizRisultatiPagina from "./pages/QuizRisultatiPagina.jsx";
import StatisticheStudente from "./pages/StatisticheStudente.jsx";
import Accedi from "./pages/Accedi.jsx";
import RichiediAuth from "./auth/RichiediAuth.jsx";

// TODO: quando si aggiunge un layout docente condiviso (header, menu) —
// vedi discussione su DocenteLayout — avvolgere le route /docente/* lì.
// Per ora nessun layout: si parte dal flusso più semplice possibile.

export default function App() {
  return (
    <Routes>
      <Route path="/accedi" element={<Accedi />} />

      <Route
        path="/docente"
        element={
          <RichiediAuth ruolo="docente">
            <DocenteHome />
          </RichiediAuth>
        }
      />
      <Route
        path="/docente/crea-quiz"
        element={
          <RichiediAuth ruolo="docente">
            <CreaQuiz />
          </RichiediAuth>
        }
      />
      <Route
        path="/docente/crea-quiz/:quizId"
        element={
          <RichiediAuth ruolo="docente">
            <CreaQuiz />
          </RichiediAuth>
        }
      />
      <Route
        path="/docente/quiz/:quizId/risultati"
        element={
          <RichiediAuth ruolo="docente">
            <RisultatiDocente />
          </RichiediAuth>
        }
      />

      <Route
        path="/studente"
        element={
          <RichiediAuth>
            <StudenteHome />
          </RichiediAuth>
        }
      />
      <Route
        path="/quiz/:quizId"
        element={
          <RichiediAuth>
            <QuizStudente />
          </RichiediAuth>
        }
      />
      <Route
        path="/quiz/:quizId/risultati"
        element={
          <RichiediAuth>
            <QuizRisultatiPagina />
          </RichiediAuth>
        }
      />
      <Route
        path="/studente/statistiche"
        element={
          <RichiediAuth>
            <StatisticheStudente />
          </RichiediAuth>
        }
      />
    </Routes>
  );
}
