// Carica quiz + risposte dello studente per un quiz e monta QuizRisultati
// ("contenuto puro"). Condiviso dai due contenitori della pagina statistiche —
// ModaleCorrezione (overlay, sotto la soglia) e PannelloArgomenti (inline,
// sopra la soglia) — così la logica di fetch della correzione sta in un punto
// solo e QuizRisultati resta senza fetch né navigazione.
//
// Stesso assemblaggio di QuizRisultatiPagina (getQuizConQuesiti +
// getRisposteStudente), ma senza cornice di pagina: qui il contenitore lo
// decide chi monta.

import { useEffect, useState } from "react";

import QuizRisultati from "../pages/QuizRisultati.jsx";
import { getQuizConQuesiti } from "../../../data/quizRepository.js";
import { getRisposteStudente } from "../../../data/risposteRepository.js";

export default function CorrezioneQuiz({ quizId, studenteId }) {
  const [dati, setDati] = useState(null);
  const [stato, setStato] = useState("caricamento"); // caricamento | pronto | errore

  useEffect(() => {
    let vivo = true;
    setStato("caricamento");
    setDati(null);
    (async () => {
      try {
        const [quiz, risposteList] = await Promise.all([
          getQuizConQuesiti(quizId),
          getRisposteStudente(quizId, studenteId),
        ]);
        if (!vivo) return;
        if (!quiz) {
          setStato("errore");
          return;
        }
        setDati({
          quiz,
          risposte: Object.fromEntries(
            risposteList.map((r) => [r.quesitoId, r.rispostaData?.opzioneScelta]),
          ),
        });
        setStato("pronto");
      } catch (err) {
        console.error(err);
        if (vivo) setStato("errore");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [quizId, studenteId]);

  if (stato === "caricamento") {
    return (
      <p className="px-4 py-10 text-center text-sm text-inchiostro/60">
        Caricamento della correzione…
      </p>
    );
  }
  if (stato === "errore") {
    return (
      <p className="px-4 py-10 text-center text-sm text-inchiostro/60">
        Correzione non disponibile.
      </p>
    );
  }
  return <QuizRisultati quiz={dati.quiz} risposte={dati.risposte} />;
}
