import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/AppLayout.jsx";
import DocenteHome from "./pages/DocenteHome.jsx";
import CreaQuiz from "./pages/CreaQuiz.jsx";
import GestioneCorsi from "./pages/GestioneCorsi.jsx";
import AndamentoCorso from "./pages/AndamentoCorso.jsx";
import RisultatiDocente from "./pages/RisultatiDocente.jsx";
import StudenteHome from "./pages/StudenteHome.jsx";
import QuizStudente from "./pages/QuizStudente.jsx";
import QuizRisultatiPagina from "./pages/QuizRisultatiPagina.jsx";
import StatisticheStudente from "./pages/StatisticheStudente.jsx";
import AdminCorsi from "./pages/admin/AdminCorsi.jsx";
import AdminDocenti from "./pages/admin/AdminDocenti.jsx";
import AdminImpostazioni from "./pages/admin/AdminImpostazioni.jsx";
import Accedi from "./pages/Accedi.jsx";
import Indirizza from "./pages/Indirizza.jsx";
import NonTrovato from "./pages/NonTrovato.jsx";
import RichiediAuth from "./auth/RichiediAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Indirizza />} />
      <Route path="/accedi" element={<Accedi />} />

      {/* Guscio condiviso (AppLayout). Un gruppo di route per area, con la
          propria guardia: studente = solo autenticazione; docente/admin = la
          capability corrispondente. */}
      <Route
        element={
          <RichiediAuth>
            <AppLayout />
          </RichiediAuth>
        }
      >
        <Route path="/studente" element={<StudenteHome />} />
        <Route path="/studente/statistiche" element={<StatisticheStudente />} />
      </Route>

      <Route
        element={
          <RichiediAuth area="docente">
            <AppLayout />
          </RichiediAuth>
        }
      >
        <Route path="/docente" element={<DocenteHome />} />
        <Route path="/docente/crea-quiz" element={<CreaQuiz />} />
        <Route path="/docente/crea-quiz/:quizId" element={<CreaQuiz />} />
        <Route path="/docente/corsi" element={<GestioneCorsi />} />
        <Route path="/docente/corsi/:corsoId/andamento" element={<AndamentoCorso />} />
        <Route path="/docente/quiz/:quizId/risultati" element={<RisultatiDocente />} />
      </Route>

      <Route
        element={
          <RichiediAuth area="admin">
            <AppLayout />
          </RichiediAuth>
        }
      >
        <Route path="/admin/corsi" element={<AdminCorsi />} />
        <Route path="/admin/docenti" element={<AdminDocenti />} />
        <Route path="/admin/impostazioni" element={<AdminImpostazioni />} />
      </Route>

      {/* Fuori dal guscio: lo svolgimento del quiz resta minimale, la
          correzione monta il proprio footer. */}
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

      <Route path="*" element={<NonTrovato />} />
    </Routes>
  );
}
