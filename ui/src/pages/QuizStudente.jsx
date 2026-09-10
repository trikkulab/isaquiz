// Pagina che lo studente apre via QR/link. La più semplice e leggera di tutte:
// nessun layout condiviso, un quesito alla volta, solo avanti (niente tasto
// indietro), feedback immediato giusto/sbagliato ma senza spiegazione (la
// spiegazione completa si vede dopo, in QuizRisultati).
//
// Rischio noto e accettato (vedi DECISIONI_DESIGN.md, "Flusso quiz studente"):
// indiceCorretto arriva al client insieme al resto del quesito, per poter
// calcolare l'esito SUBITO senza andata/ritorno dal server — quindi uno
// studente che ispeziona il codice/stato React può vedere in anticipo tutte
// le risposte corrette del quiz. Scelta deliberata per evitare il costo (in
// Cloud Function invocate, una per risposta) e la complessità di validare
// ogni risposta lato server. Da rivedere SOLO se il problema si presenta
// concretamente, non preventivamente.

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import BarraQuiz from "../components/BarraQuiz.jsx";
import QuesitoCard from "../components/QuesitoCard.jsx";
import BottoneAvanti from "../components/BottoneAvanti.jsx";
import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import { getQuizConQuesiti } from "../../../data/quizRepository.js";
import { saveAnswer } from "../../../data/risposteRepository.js";

export default function QuizStudente() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const studente = useUtenteCorrente();

  const [quiz, setQuiz] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  const [indiceQuesito, setIndiceQuesito] = useState(0);
  const [indiceSelezionato, setIndiceSelezionato] = useState(null);
  const [risposte, setRisposte] = useState({}); // { [quesitoId]: indiceSelezionato }

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const q = await getQuizConQuesiti(quizId);
        if (!attivo) return;
        if (!q) setErrore("Quiz non trovato.");
        else if (q.stato === "bozza") setErrore("Questo quiz non è ancora stato avviato dal docente.");
        else if (q.stato === "chiuso") setErrore("Questo quiz è chiuso: non accetta più risposte.");
        else if (q.stato === "archiviato") setErrore("Questo quiz non è più disponibile.");
        else if (!q.quesiti?.length) setErrore("Questo quiz non ha ancora quesiti.");
        else setQuiz(q);
      } catch (err) {
        if (attivo) setErrore("Impossibile caricare il quiz.");
        console.error(err);
      } finally {
        if (attivo) setCaricamento(false);
      }
    })();
    return () => {
      attivo = false;
    };
  }, [quizId]);

  if (caricamento) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-inchiostro/60">
        Caricamento del quiz…
      </div>
    );
  }

  if (errore) {
    // Stessa forma di "Area riservata" (auth/RichiediAuth): messaggio + via
    // d'uscita. Serve per tutti gli stati bloccanti — non trovato, non avviato,
    // chiuso, archiviato, senza quesiti, errore di rete.
    return (
      <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-titoli text-lg font-bold">Quiz non disponibile</p>
        <p className="text-sm text-inchiostro/70">{errore}</p>
        <Link to="/studente" className="text-sm font-medium text-primario">
          Torna alla home
        </Link>
      </div>
    );
  }

  const quesitoCorrente = quiz.quesiti[indiceQuesito];
  const ultimoQuesito = indiceQuesito === quiz.quesiti.length - 1;

  function handleSeleziona(indice) {
    if (indiceSelezionato !== null) return;

    setIndiceSelezionato(indice);
    setRisposte((precedenti) => ({ ...precedenti, [quesitoCorrente.id]: indice }));
    // Fire-and-forget: la correzione immediata usa lo stato in memoria; se la
    // scrittura fallisce lo studente non se ne accorge (la rivedrà solo un
    // eventuale accesso differito ai risultati).
    saveAnswer(quiz.id, studente.id, quesitoCorrente.id, { opzioneScelta: indice }).catch(
      (err) => console.error("saveAnswer:", err),
    );
  }

  function handleAvanti() {
    if (ultimoQuesito) {
      // Lo studente ha appena finito: passiamo quiz + risposte già in memoria,
      // così QuizRisultatiPagina non deve rileggere nulla. Se la pagina viene
      // aperta senza questo state (refresh, link diretto), la ricarica lei da
      // Firestore.
      navigate(`/quiz/${quiz.id}/risultati`, { state: { quiz, risposte } });
      return;
    }
    setIndiceQuesito((i) => i + 1);
    setIndiceSelezionato(null);
  }

  return (
    <div className="flex min-h-screen flex-col pb-[100px]">
      <BarraQuiz
        studente={studente}
        quiz={quiz}
        corrente={indiceQuesito + 1}
        totale={quiz.quesiti.length}
      />

      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-5">
        <QuesitoCard
          quesito={quesitoCorrente}
          indiceSelezionato={indiceSelezionato}
          corretta={indiceSelezionato !== null ? indiceSelezionato === quesitoCorrente.indiceCorretto : null}
          onSeleziona={handleSeleziona}
        />
      </main>

      {indiceSelezionato !== null && (
        <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-sfondo to-transparent p-4">
          <BottoneAvanti onAvanti={handleAvanti} etichetta={`${ultimoQuesito ? "Vedi risultati" : "Avanti"} →`} />
        </div>
      )}
    </div>
  );
}
