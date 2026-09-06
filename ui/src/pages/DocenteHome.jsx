// Home del docente: elenco dei propri quiz (bozze e attivi), ingresso a
// CreaQuiz, e le azioni per quiz — avviare una bozza, eliminarla, rivedere il
// link/QR di un quiz attivo.
//
// Stile "docente": sobrio e funzionale (vedi CLAUDE.md, "Schermate docente").
// Niente accesso diretto a Firestore: tutto dai repository in /data.
//
// Non ancora qui: modificare una bozza (serve il caricamento di un quiz
// esistente in CreaQuiz), duplicare un quiz, i risultati (serve
// risposteRepository reale).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUtenteCorrente } from "../../../data/mockAuth.js";
import {
  getQuizDocente,
  avviaQuiz,
  eliminaQuiz,
  duplicaQuiz,
} from "../../../data/quizRepository.js";
import AccessoQuiz from "../components/AccessoQuiz.jsx";

const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";
const BOTTONE_SECONDARIO =
  "rounded-lg border border-bordo bg-white px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario disabled:cursor-not-allowed disabled:opacity-40";

const BADGE = {
  bozza: "bg-sfondo text-primario",
  attivo: "bg-corretto-sfondo text-corretto",
  archiviato: "bg-[#1e1b2e]/10 text-[#1e1b2e]/55",
};

export default function DocenteHome() {
  const utente = getUtenteCorrente();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [linkAperto, setLinkAperto] = useState(null); // quizId col pannello link aperto
  const [conferma, setConferma] = useState(null); // { tipo: "avvio"|"elimina", id }
  const [azioneInCorso, setAzioneInCorso] = useState(false);

  async function ricarica() {
    try {
      setQuiz(await getQuizDocente(utente.id));
    } catch (err) {
      setErrore("Impossibile caricare i quiz. L'emulatore Firestore è avviato?");
      console.error(err);
    } finally {
      setCaricamento(false);
    }
  }

  useEffect(() => {
    ricarica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente.id]);

  async function esegui(fn) {
    if (azioneInCorso) return;
    setAzioneInCorso(true);
    setErrore(null);
    try {
      await fn();
      await ricarica();
      setConferma(null);
    } catch (err) {
      setErrore(err.message || "Operazione non riuscita.");
      console.error(err);
    } finally {
      setAzioneInCorso(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">I miei quiz</h1>
        <button
          type="button"
          className={BOTTONE_PRIMARIO}
          onClick={() => navigate("/docente/crea-quiz")}
        >
          Crea nuovo quiz
        </button>
      </div>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
        </div>
      )}

      {caricamento ? (
        <p className="text-sm text-[#1e1b2e]/60">Caricamento…</p>
      ) : quiz.length === 0 ? (
        <div className="rounded-xl border border-bordo bg-white p-6 text-sm text-[#1e1b2e]/60">
          Nessun quiz. Inizia con «Crea nuovo quiz».
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {quiz.map((q) => {
            const nQuesiti = q.quesiti?.length ?? 0;
            return (
              <li key={q.id} className="rounded-xl border border-bordo bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{q.titolo}</p>
                    <p className="mt-0.5 text-xs text-[#1e1b2e]/55">
                      {[q.materia, `${nQuesiti} ${nQuesiti === 1 ? "quesito" : "quesiti"}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      BADGE[q.stato] ?? BADGE.archiviato
                    }`}
                  >
                    {q.stato}
                  </span>
                </div>

                {/* Azioni */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.stato === "bozza" && (
                    <>
                      <button
                        type="button"
                        className={BOTTONE_PRIMARIO}
                        onClick={() => setConferma({ tipo: "avvio", id: q.id })}
                      >
                        Pubblica e avvia
                      </button>
                      <button
                        type="button"
                        className={BOTTONE_SECONDARIO}
                        onClick={() => navigate(`/docente/crea-quiz/${q.id}`)}
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        className={BOTTONE_SECONDARIO}
                        onClick={() => setConferma({ tipo: "elimina", id: q.id })}
                      >
                        Elimina
                      </button>
                    </>
                  )}

                  {q.stato === "attivo" && (
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      onClick={() => setLinkAperto((v) => (v === q.id ? null : q.id))}
                    >
                      {linkAperto === q.id ? "Nascondi link" : "Link e QR per gli studenti"}
                    </button>
                  )}

                  {q.stato !== "bozza" && (
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      disabled={azioneInCorso}
                      onClick={async () => {
                        if (azioneInCorso) return;
                        setAzioneInCorso(true);
                        setErrore(null);
                        try {
                          const nuovoId = await duplicaQuiz(q.id, utente.id);
                          navigate(`/docente/crea-quiz/${nuovoId}`);
                        } catch (err) {
                          setErrore(err.message || "Duplicazione non riuscita.");
                          setAzioneInCorso(false);
                        }
                      }}
                    >
                      Duplica
                    </button>
                  )}
                </div>

                {/* Conferma azione */}
                {conferma?.id === q.id && (
                  <div className="mt-3 rounded-lg border border-bordo bg-sfondo p-3 text-sm">
                    {conferma.tipo === "avvio" ? (
                      <p className="mb-2">
                        Una volta avviato, il quiz <strong>non è più modificabile</strong> né
                        eliminabile. Procedo?
                      </p>
                    ) : (
                      <p className="mb-2">Eliminare definitivamente questa bozza?</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={BOTTONE_PRIMARIO}
                        disabled={azioneInCorso}
                        onClick={() =>
                          esegui(() =>
                            conferma.tipo === "avvio" ? avviaQuiz(q.id) : eliminaQuiz(q.id),
                          )
                        }
                      >
                        {azioneInCorso
                          ? "Attendi…"
                          : conferma.tipo === "avvio"
                          ? "Sì, avvia"
                          : "Sì, elimina"}
                      </button>
                      <button
                        type="button"
                        className={BOTTONE_SECONDARIO}
                        disabled={azioneInCorso}
                        onClick={() => setConferma(null)}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}

                {linkAperto === q.id && q.stato === "attivo" && (
                  <div className="mt-3">
                    <AccessoQuiz quizId={q.id} dimensioneQr={148} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
