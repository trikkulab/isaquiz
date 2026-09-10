import { Routes, Route } from "react-router-dom";

import DocenteLayout from "./components/DocenteLayout.jsx";
import DocenteHome from "./pages/DocenteHome.jsx";
import CreaQuiz from "./pages/CreaQuiz.jsx";
import GestioneCorsi from "./pages/GestioneCorsi.jsx";
import RisultatiDocente from "./pages/RisultatiDocente.jsx";
import StudenteHome from "./pages/StudenteHome.jsx";
import QuizStudente from "./pages/QuizStudente.jsx";
import QuizRisultatiPagina from "./pages/QuizRisultatiPagina.jsx";
import StatisticheStudente from "./pages/StatisticheStudente.jsx";
import Accedi from "./pages/Accedi.jsx";
import Indirizza from "./pages/Indirizza.jsx";
import NonTrovato from "./pages/NonTrovato.jsx";
import RichiediAuth from "./auth/RichiediAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Indirizza />} />
      <Route path="/accedi" element={<Accedi />} />

      {/* Area docente: guardia + guscio di navigazione (header/menu/footer)
          condivisi una volta sola per tutte le sotto-route. */}
      <Route
        element={
          <RichiediAuth ruolo="docente">
            <DocenteLayout />
          </RichiediAuth>
        }
      >
        <Route path="/docente" element={<DocenteHome />} />
        <Route path="/docente/crea-quiz" element={<CreaQuiz />} />
        <Route path="/docente/crea-quiz/:quizId" element={<CreaQuiz />} />
        <Route path="/docente/corsi" element={<GestioneCorsi />} />
        <Route path="/docente/quiz/:quizId/risultati" element={<RisultatiDocente />} />
      </Route>

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

      <Route path="*" element={<NonTrovato />} />
    </Routes>
  );
}
