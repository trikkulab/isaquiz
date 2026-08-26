// Pagina che lo studente apre via QR/link. La più semplice e leggera di tutte:
// nessun layout condiviso, una domanda alla volta, solo avanti (niente tasto
// indietro), feedback immediato giusto/sbagliato ma senza spiegazione (la
// spiegazione completa si vede dopo, in QuizRisultati).

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import BarraQuiz from "../components/BarraQuiz.jsx";
import DomandaCard from "../components/DomandaCard.jsx";
import { getUtenteCorrente } from "../../../data/mockAuth.js";
import { saveAnswer } from "../../../data/risposteRepository.js";

// TODO Fase 1 (seguito): sostituire con getQuizConDomande(quizId) non appena
// Firestore ha dati di prova. Stessa forma dati, così il cambio è isolato qui.
//
// Nota di design ancora aperta: indiceCorretto qui serve solo a calcolare
// SUBITO, in memoria, se la scelta dello studente è giusta o sbagliata (senza
// andata/ritorno dal server) — non viene mai passato a DomandaCard, che
// riceve solo l'esito booleano (vedi DECISIONI_DESIGN.md). Resta comunque da
// decidere, quando si scrivono le regole di sicurezza Firestore, se e come
// esporre questo campo al client sul documento domanda reale.
const QUIZ_MOCK = {
  id: "demo",
  titolo: "Verifica: il Rinascimento",
  materia: "Storia",
  docente: "Prof. Rossi",
  domande: [
    {
      id: "d1",
      testo: "In quale città nasce il Rinascimento italiano?",
      opzioni: ["Venezia", "Firenze", "Roma", "Milano"],
      indiceCorretto: 1,
      argomento: "Contesto storico",
      spiegazione:
        "Firenze, grazie al mecenatismo di famiglie come i Medici, fu il centro propulsore del Rinascimento tra '400 e '500.",
    },
    {
      id: "d2",
      testo: "Chi ha dipinto la Gioconda?",
      opzioni: ["Michelangelo", "Raffaello", "Leonardo da Vinci", "Botticelli"],
      indiceCorretto: 2,
      argomento: "Arte",
      spiegazione: "La Gioconda (Monna Lisa) è un dipinto di Leonardo da Vinci, realizzato tra il 1503 e il 1519.",
    },
    {
      id: "d3",
      testo: "Quale famiglia fiorentina finanziò molti artisti del Rinascimento?",
      opzioni: ["I Borgia", "I Medici", "I Visconti", "Gli Sforza"],
      indiceCorretto: 1,
      argomento: "Mecenatismo",
      spiegazione:
        "I Medici, potente famiglia di banchieri fiorentini, finanziarono artisti come Botticelli e Michelangelo.",
    },
    {
      id: "d4",
      testo: "Cosa si intende per 'prospettiva' in pittura?",
      opzioni: [
        "Una tecnica per mescolare i colori",
        "Un modo di rappresentare la profondità sulla tela",
        "Il contorno scuro delle figure",
        "Un tipo di pennello",
      ],
      indiceCorretto: 1,
      argomento: "Tecniche pittoriche",
      spiegazione:
        "La prospettiva è la tecnica geometrica che permette di rappresentare la profondità e lo spazio tridimensionale su una superficie piana.",
    },
  ],
};

export default function QuizStudente() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const studente = getUtenteCorrente("studente");
  const quiz = QUIZ_MOCK;

  const [indiceDomanda, setIndiceDomanda] = useState(0);
  const [indiceSelezionato, setIndiceSelezionato] = useState(null);
  const [risposte, setRisposte] = useState({}); // { [domandaId]: indiceSelezionato }

  const domandaCorrente = quiz.domande[indiceDomanda];
  const ultimaDomanda = indiceDomanda === quiz.domande.length - 1;

  function handleSeleziona(indice) {
    if (indiceSelezionato !== null) return;

    setIndiceSelezionato(indice);
    setRisposte((precedenti) => ({ ...precedenti, [domandaCorrente.id]: indice }));
    saveAnswer(quiz.id ?? quizId, studente.id, domandaCorrente.id, {
      opzioneScelta: indice,
    });
  }

  function handleAvanti() {
    if (ultimaDomanda) {
      // Lo studente ha appena finito: passiamo quiz + risposte già in memoria,
      // così QuizRisultati non deve rileggere nulla (vedi commento nello stub
      // originale). Se la pagina viene aperta senza questo state (refresh,
      // link diretto), QuizRisultati lo gestisce con un fallback proprio.
      navigate(`/quiz/${quiz.id ?? quizId}/risultati`, { state: { quiz, risposte } });
      return;
    }
    setIndiceDomanda((i) => i + 1);
    setIndiceSelezionato(null);
  }

  return (
    <div className="flex min-h-screen flex-col pb-[100px]">
      <BarraQuiz
        studente={studente}
        quiz={quiz}
        corrente={indiceDomanda + 1}
        totale={quiz.domande.length}
      />

      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-5">
        <DomandaCard
          domanda={domandaCorrente}
          indiceSelezionato={indiceSelezionato}
          corretta={indiceSelezionato !== null ? indiceSelezionato === domandaCorrente.indiceCorretto : null}
          onSeleziona={handleSeleziona}
        />
      </main>

      {indiceSelezionato !== null && (
        <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-sfondo to-transparent p-4">
          <button
            type="button"
            className="w-full max-w-[560px] animate-comparsa rounded-full bg-gradient-to-br from-accento to-primario p-4 font-titoli text-base font-bold text-white shadow-bottone active:scale-[0.98]"
            onClick={handleAvanti}
          >
            {ultimaDomanda ? "Vedi risultati" : "Avanti"} →
          </button>
        </div>
      )}
    </div>
  );
}
