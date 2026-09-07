// Vista risultati di UN quiz per il docente: chi ha risposto e come, in tempo
// reale (le risposte arrivano via onSnapshot mentre la classe risponde).
// Route /docente/quiz/:quizId/risultati.
//
// Stile "docente": sobrio, tabellare, priorità a densità e leggibilità (vedi
// CLAUDE.md, "Schermate docente e statistiche"). Niente libreria di grafici
// per ora — la pagina statistiche vera (per-argomento, adattiva) è Fase 4/5.
//
// Il giusto/sbagliato è calcolato qui lato client (opzioneScelta vs
// indiceCorretto) — coerente col resto del progetto, `corretta` su RISPOSTA
// resta scrivibile solo server-side (vedi DECISIONI_DESIGN.md).

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getQuizConQuesiti } from "../../../data/quizRepository.js";
import { ascoltaRisposteQuiz } from "../../../data/risposteRepository.js";
import { getUtente, nomeVisibile } from "../../../data/utentiRepository.js";

export default function RisultatiDocente() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [studenti, setStudenti] = useState([]); // [{ id, nome, risposte, corrette, risposteN }]
  const [perQuesito, setPerQuesito] = useState([]); // [{ id, testo, argomento, corrette, date }]
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  const nomiRef = useRef(new Map()); // studenteId -> nome (cache, evita refetch a ogni update)
  const versioneRef = useRef(0); // guardia anti-race tra update ravvicinati

  useEffect(() => {
    let vivo = true;
    let annulla = null;

    async function aggiornaDati(q, risposte) {
      const v = ++versioneRef.current;

      const corretto = new Map(q.quesiti.map((x) => [x.id, x.indiceCorretto]));

      const perStudente = new Map();
      for (const r of risposte) {
        if (!perStudente.has(r.studenteId)) perStudente.set(r.studenteId, {});
        perStudente.get(r.studenteId)[r.quesitoId] = r.rispostaData?.opzioneScelta;
      }

      const ids = [...perStudente.keys()];
      const mancanti = ids.filter((id) => !nomiRef.current.has(id));
      if (mancanti.length) {
        const utenti = await Promise.all(mancanti.map((id) => getUtente(id)));
        mancanti.forEach((id, i) => nomiRef.current.set(id, nomeVisibile(utenti[i]) || id));
      }
      if (!vivo || v !== versioneRef.current) return; // un update più recente ha vinto

      const righe = ids
        .map((id) => {
          const risp = perStudente.get(id);
          const corrette = Object.entries(risp).filter(
            ([qId, scelta]) => scelta === corretto.get(qId),
          ).length;
          return {
            id,
            nome: nomiRef.current.get(id),
            corrette,
            risposteN: Object.keys(risp).length,
          };
        })
        .sort((a, b) => b.corrette - a.corrette);

      const perQ = q.quesiti.map((x) => {
        const date = risposte.filter((r) => r.quesitoId === x.id);
        const corr = date.filter((r) => r.rispostaData?.opzioneScelta === x.indiceCorretto).length;
        return { id: x.id, testo: x.testo, argomento: x.argomento, corrette: corr, date: date.length };
      });

      setStudenti(righe);
      setPerQuesito(perQ);
      setCaricamento(false);
    }

    (async () => {
      try {
        const q = await getQuizConQuesiti(quizId);
        if (!vivo) return;
        if (!q) {
          setErrore("Quiz non trovato.");
          setCaricamento(false);
          return;
        }
        setQuiz(q);
        annulla = ascoltaRisposteQuiz(
          quizId,
          (risposte) => aggiornaDati(q, risposte),
          (err) => {
            console.error("ascoltaRisposteQuiz:", err);
            if (vivo) setErrore("Connessione ai risultati interrotta. Ricarica la pagina.");
          },
        );
      } catch (err) {
        console.error(err);
        if (vivo) {
          setErrore("Impossibile caricare i risultati.");
          setCaricamento(false);
        }
      }
    })();

    return () => {
      vivo = false;
      if (annulla) annulla();
    };
  }, [quizId]);

  if (caricamento) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#1e1b2e]/60">Caricamento…</div>;
  }

  const nQuesiti = quiz?.quesiti.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        type="button"
        className="mb-4 text-sm font-medium text-primario"
        onClick={() => navigate("/docente")}
      >
        ← I miei quiz
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">{quiz?.titolo ?? "Risultati"}</h1>
        <p className="mt-0.5 text-xs text-[#1e1b2e]/55">
          {[
            quiz?.materia,
            `${studenti.length} ${studenti.length === 1 ? "studente" : "studenti"}`,
            "aggiornamento automatico",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
        </div>
      )}

      {studenti.length === 0 ? (
        <div className="rounded-xl border border-bordo bg-white p-6 text-sm text-[#1e1b2e]/60">
          Ancora nessuna risposta.
        </div>
      ) : (
        <>
          <section className="mb-6 overflow-hidden rounded-xl border border-bordo bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bordo text-left text-xs text-[#1e1b2e]/55">
                  <th className="px-4 py-2 font-medium">Studente</th>
                  <th className="px-4 py-2 font-medium">Punteggio</th>
                  <th className="px-4 py-2 font-medium">Risposte</th>
                </tr>
              </thead>
              <tbody>
                {studenti.map((s) => (
                  <tr key={s.id} className="border-b border-bordo last:border-0">
                    <td className="px-4 py-2">{s.nome}</td>
                    <td className="px-4 py-2 font-medium">
                      {s.corrette} / {nQuesiti}
                    </td>
                    <td className="px-4 py-2 text-[#1e1b2e]/60">
                      {s.risposteN} / {nQuesiti}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-bordo bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Per quesito</h2>
            <ol className="flex flex-col gap-2">
              {perQuesito.map((q, i) => (
                <li key={q.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="text-[#1e1b2e]/40">{i + 1}.</span> {q.testo}
                    {q.argomento && (
                      <span className="ml-1 text-xs text-[#1e1b2e]/45">· {q.argomento}</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-[#1e1b2e]/70">
                    {q.corrette}/{q.date} corrette
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
