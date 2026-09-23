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
//
// Una risposta data non si cambia più (rules: solo `create` su `risposte`).
// Per questo: (1) al caricamento si rileggono le risposte già registrate e si
// riprende dal primo quesito senza risposta — o si va dritti ai risultati se
// sono già tutte date; (2) l'esito ✓/✗ si mostra solo a scrittura CONFERMATA
// dal server, così ricaricare la pagina non regala mai un secondo tentativo
// dopo aver visto l'esito. Vedi DECISIONI_DESIGN.md, "Flusso quiz studente".

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import BarraQuiz from "../components/BarraQuiz.jsx";
import QuesitoCard from "../components/QuesitoCard.jsx";
import BottoneAvanti from "../components/BottoneAvanti.jsx";
import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import { getQuizConQuesiti } from "../../../data/quizRepository.js";
import { getRisposteStudente, saveAnswer } from "../../../data/risposteRepository.js";

export default function QuizStudente() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const studente = useUtenteCorrente();

  const [quiz, setQuiz] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  const [indiceQuesito, setIndiceQuesito] = useState(0);
  const [indiceSelezionato, setIndiceSelezionato] = useState(null);
  const [confermata, setConfermata] = useState(false); // scrittura confermata → si mostra ✓/✗
  const [erroreSalvataggio, setErroreSalvataggio] = useState(false);
  const [risposte, setRisposte] = useState({}); // { [quesitoId]: opzioneScelta }, solo quelle registrate

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const [q, giaDate] = await Promise.all([
          getQuizConQuesiti(quizId),
          getRisposteStudente(quizId, studente.id),
        ]);
        if (!attivo) return;
        if (!q) setErrore("Quiz non trovato.");
        else if (q.stato === "bozza") setErrore("Questo quiz non è ancora stato avviato dal docente.");
        else if (q.stato === "chiuso") setErrore("Questo quiz è chiuso: non accetta più risposte.");
        else if (q.stato === "archiviato") setErrore("Questo quiz non è più disponibile.");
        else if (!q.quesiti?.length) setErrore("Questo quiz non ha ancora quesiti.");
        else {
          const registrate = Object.fromEntries(
            giaDate.map((r) => [r.quesitoId, r.rispostaData?.opzioneScelta]),
          );
          const primoDaFare = q.quesiti.findIndex((qs) => !(qs.id in registrate));
          if (primoDaFare === -1) {
            // Già tutto risposto (refresh sull'ultimo quesito, QR riaperto):
            // niente da rifare, si va alla correzione.
            navigate(`/quiz/${q.id}/risultati`, { replace: true, state: { quiz: q, risposte: registrate } });
            return;
          }
          setRisposte(registrate);
          setIndiceQuesito(primoDaFare);
          setQuiz(q);
        }
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
  }, [quizId, studente.id, navigate]);

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
    salva(indice);
  }

  // La scelta resta bloccata anche se il salvataggio fallisce: "Riprova"
  // rimanda la STESSA opzione. Se il server ha già una risposta registrata
  // (tentativo precedente arrivato in ritardo), vince quella.
  async function salva(indice) {
    const quesitoId = quesitoCorrente.id;
    setErroreSalvataggio(false);
    try {
      const registrata = await saveAnswer(quiz.id, studente.id, quesitoId, { opzioneScelta: indice });
      const scelta = registrata?.opzioneScelta ?? indice;
      setIndiceSelezionato(scelta);
      setRisposte((precedenti) => ({ ...precedenti, [quesitoId]: scelta }));
      setConfermata(true);
    } catch (err) {
      console.error("saveAnswer:", err);
      setErroreSalvataggio(true);
    }
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
    setConfermata(false);
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
          corretta={confermata ? indiceSelezionato === quesitoCorrente.indiceCorretto : null}
          onSeleziona={handleSeleziona}
        />
      </main>

      {erroreSalvataggio && (
        <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-sfondo to-transparent p-4">
          <p className="text-center text-sm text-errato">
            Risposta non salvata: controlla la connessione. Se il docente ha chiuso il quiz, non accetta più risposte.
          </p>
          <button
            type="button"
            onClick={() => salva(indiceSelezionato)}
            className="rounded-full bg-primario px-6 py-3 font-semibold text-su-primario transition-transform active:scale-[0.97]"
          >
            Riprova
          </button>
        </div>
      )}

      {confermata && (
        <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-sfondo to-transparent p-4">
          <BottoneAvanti onAvanti={handleAvanti} etichetta={`${ultimoQuesito ? "Vedi risultati" : "Avanti"} →`} />
        </div>
      )}
    </div>
  );
}
