// Contenitore "pagina intera" per QuizRisultati — route /quiz/:quizId/risultati.
// Procura i dati (da navigate state se si arriva da QuizStudente, altrimenti
// li rilegge da Firestore per link diretto / refresh), incornicia il contenuto
// con la stessa BarraQuiz del quiz (stato "completato", così il riepilogo
// sembra la coda naturale del test), una via d'uscita e il footer.
// QuizRisultati resta "contenuto puro".

import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import QuizRisultati from "./QuizRisultati.jsx";
import BarraQuiz from "../components/BarraQuiz.jsx";
import PiePagina from "../components/PiePagina.jsx";
import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import { getQuizConQuesiti } from "../../../data/quizRepository.js";
import { getRisposteStudente } from "../../../data/risposteRepository.js";

function Uscita() {
  return (
    <div className="mx-auto max-w-[560px] px-4 pb-2">
      <Link
        to="/studente"
        className="block rounded-xl bg-primario px-4 py-3 text-center font-titoli text-base font-bold text-su-primario transition-transform active:scale-[0.98]"
      >
        Torna alla home
      </Link>
    </div>
  );
}

export default function QuizRisultatiPagina() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const studente = useUtenteCorrente();

  const daStato = state?.quiz && state?.risposte ? state : null;
  const [dati, setDati] = useState(daStato);
  const [caricamento, setCaricamento] = useState(!daStato);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    if (dati) return;
    let attivo = true;
    (async () => {
      try {
        const [quiz, risposteList] = await Promise.all([
          getQuizConQuesiti(quizId),
          getRisposteStudente(quizId, studente.id),
        ]);
        if (!attivo) return;
        if (!quiz) return setErrore("Quiz non trovato.");
        if (risposteList.length === 0)
          return setErrore("Non risultano tue risposte a questo quiz.");
        setDati({
          quiz,
          risposte: Object.fromEntries(
            risposteList.map((r) => [r.quesitoId, r.rispostaData?.opzioneScelta]),
          ),
        });
      } catch (err) {
        if (attivo) setErrore("Impossibile caricare la correzione.");
        console.error(err);
      } finally {
        if (attivo) setCaricamento(false);
      }
    })();
    return () => {
      attivo = false;
    };
  }, [dati, quizId, studente.id]);

  if (caricamento) {
    return (
      <div className="flex min-h-screen flex-col">
        <p className="mx-auto max-w-[560px] flex-1 px-4 py-10 text-center text-inchiostro/60">
          Caricamento della correzione…
        </p>
        <PiePagina />
      </div>
    );
  }

  if (errore) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-titoli text-lg font-bold">Correzione non disponibile</p>
        <p className="text-sm text-inchiostro/70">{errore}</p>
        <Link to="/studente" className="text-sm font-medium text-primario">
          Torna alla home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BarraQuiz
        studente={studente}
        quiz={dati.quiz}
        totale={dati.quiz.quesiti.length}
        completato
      />
      <div className="flex-1">
        <QuizRisultati quiz={dati.quiz} risposte={dati.risposte} />
        <Uscita />
      </div>
      <PiePagina />
    </div>
  );
}
