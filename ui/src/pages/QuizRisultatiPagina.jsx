// Contenitore "pagina intera" per QuizRisultati — route /quiz/:quizId/risultati.
// Procura i dati (da navigate state se si arriva da QuizStudente, altrimenti
// li rilegge da Firestore per link diretto / refresh) e aggiunge il credito
// tecnico in fondo, che ha senso solo qui. QuizRisultati resta "contenuto puro".

import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import QuizRisultati from "./QuizRisultati.jsx";
import CreditoTecnico from "../components/CreditoTecnico.jsx";
import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import { getQuizConQuesiti } from "../../../data/quizRepository.js";
import { getRisposteStudente } from "../../../data/risposteRepository.js";

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

  return (
    <div>
      {caricamento ? (
        <p className="mx-auto max-w-[560px] px-4 py-10 text-center text-inchiostro/60">
          Caricamento della correzione…
        </p>
      ) : errore ? (
        <p className="mx-auto max-w-[560px] px-4 py-10 text-center text-inchiostro/70">{errore}</p>
      ) : (
        <QuizRisultati quiz={dati.quiz} risposte={dati.risposte} />
      )}
      <CreditoTecnico />
    </div>
  );
}
