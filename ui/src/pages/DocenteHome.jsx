// Home del docente: elenco dei propri quiz, ingresso a CreaQuiz, e le azioni
// per quiz — pubblicare/modificare/eliminare una bozza, chiudere/riaprire un
// quiz attivo, duplicare, rivedere il link/QR.
//
// Stile "docente": sobrio e funzionale (vedi CLAUDE.md, "Schermate docente").
// Niente accesso diretto a Firestore: tutto dai repository in /data.
//
// Non ancora qui: i risultati (serve risposteRepository reale).

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import {
  getQuizDocente,
  avviaQuiz,
  chiudiQuiz,
  riapriQuiz,
  eliminaQuiz,
  duplicaQuiz,
  archiviaQuiz,
  ripristinaQuiz,
} from "../../../data/quizRepository.js";
import AccessoQuiz from "../components/AccessoQuiz.jsx";
import BottoneVerso from "../components/BottoneVerso.jsx";

const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-su-primario transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";
const BOTTONE_SECONDARIO =
  "rounded-lg border border-bordo bg-superficie px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario disabled:cursor-not-allowed disabled:opacity-40";
const FILTRO =
  "rounded-lg border border-bordo bg-superficie px-2.5 py-1.5 text-xs outline-none focus:border-primario disabled:opacity-40";

// Ordine "logico" degli stati per l'omonimo ordinamento.
const ORDINE_STATO = { bozza: 0, attivo: 1, chiuso: 2, archiviato: 3 };
const perData = (a, b) => (b.creato?.toMillis?.() ?? 0) - (a.creato?.toMillis?.() ?? 0);

// Verso "naturale" di ciascun criterio (prima di invertire con BottoneVerso).
const VERSO_NATURALE_QUIZ = { recenti: "desc", titolo: "asc", stato: "asc" };

function comparatoreQuiz(ordine) {
  if (ordine === "titolo") {
    return (a, b) => (a.titolo || "").localeCompare(b.titolo || "", "it");
  }
  if (ordine === "stato") {
    return (a, b) =>
      (ORDINE_STATO[a.stato] ?? 9) - (ORDINE_STATO[b.stato] ?? 9) || perData(a, b);
  }
  return perData; // "recenti"
}

// Un colore per stato: si riconosce a colpo d'occhio senza leggere. L'etichetta
// testuale resta comunque (accessibilità: mai solo colore).
const BADGE = {
  bozza: "bg-stato-bozza-sfondo text-stato-bozza",
  attivo: "bg-stato-attivo-sfondo text-stato-attivo",
  chiuso: "bg-stato-chiuso-sfondo text-stato-chiuso",
  archiviato: "bg-stato-archiviato-sfondo text-stato-archiviato",
};

// Azioni che passano da una conferma inline. `fn(quizId)` ritorna una Promise.
const AZIONI_CONFERMA = {
  avvio: {
    testo:
      "Una volta avviato, il quiz non è più modificabile né eliminabile. Procedo?",
    conferma: "Sì, avvia",
    fn: avviaQuiz,
  },
  chiudi: {
    testo:
      "Gli studenti non potranno più aprire il quiz. Potrai riaprirlo in seguito (es. per i ritardatari).",
    conferma: "Sì, chiudi",
    fn: chiudiQuiz,
  },
  elimina: {
    testo: "Eliminare definitivamente questa bozza?",
    conferma: "Sì, elimina",
    fn: eliminaQuiz,
  },
  archivia: {
    testo:
      "Il quiz esce dalle liste attive (i risultati restano consultabili). L'archiviazione è definitiva.",
    conferma: "Sì, archivia",
    fn: archiviaQuiz,
  },
};

export default function DocenteHome() {
  const utente = useUtenteCorrente();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [linkAperto, setLinkAperto] = useState(null); // quizId col pannello link aperto
  const [conferma, setConferma] = useState(null); // { tipo: "avvio"|"elimina", id }
  const [azioneInCorso, setAzioneInCorso] = useState(false);

  const [ricerca, setRicerca] = useState("");
  const [filtroStato, setFiltroStato] = useState("");
  const [filtroMateria, setFiltroMateria] = useState("");
  const [ordine, setOrdine] = useState("recenti");
  const [ordineInverso, setOrdineInverso] = useState(false);
  // Come "Mostra inattivi" per i quesiti (CreaQuiz): gli archiviati escono
  // dalle liste attive salvo spunta esplicita.
  const [mostraArchiviati, setMostraArchiviati] = useState(false);

  const ciSonoArchiviati = useMemo(() => quiz.some((q) => q.stato === "archiviato"), [quiz]);
  // Base su cui lavorano filtri, ordinamenti e conteggi: quiz meno gli
  // archiviati (a meno del toggle).
  const quizBase = useMemo(
    () => (mostraArchiviati ? quiz : quiz.filter((q) => q.stato !== "archiviato")),
    [quiz, mostraArchiviati],
  );

  const materieDisponibili = useMemo(
    () => [...new Set(quizBase.map((q) => q.materia).filter(Boolean))].sort(),
    [quizBase],
  );
  const statiPresenti = useMemo(
    () =>
      [...new Set(quizBase.map((q) => q.stato))].sort(
        (a, b) => (ORDINE_STATO[a] ?? 9) - (ORDINE_STATO[b] ?? 9),
      ),
    [quizBase],
  );

  const quizVisibili = useMemo(() => {
    const cerca = ricerca.trim().toLowerCase();
    const cmp = comparatoreQuiz(ordine);
    return quizBase
      .filter((q) => {
        if (filtroStato && q.stato !== filtroStato) return false;
        if (filtroMateria && q.materia !== filtroMateria) return false;
        if (cerca && !q.titolo?.toLowerCase().includes(cerca)) return false;
        return true;
      })
      .sort(ordineInverso ? (a, b) => -cmp(a, b) : cmp);
  }, [quizBase, ricerca, filtroStato, filtroMateria, ordine, ordineInverso]);

  const ordineDiscendente = (VERSO_NATURALE_QUIZ[ordine] === "desc") !== ordineInverso;

  const filtriAttivi = Boolean(ricerca.trim() || filtroStato || filtroMateria);
  function azzeraFiltri() {
    setRicerca("");
    setFiltroStato("");
    setFiltroMateria("");
  }

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
        <h1 className="text-xl font-semibold">
          I miei quiz{" "}
          {filtriAttivi && (
            <span className="text-sm font-normal text-inchiostro/50">
              ({quizVisibili.length} di {quizBase.length})
            </span>
          )}
        </h1>
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

      {!caricamento && quiz.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            className={`${FILTRO} min-w-[140px] flex-1`}
            placeholder="Cerca per titolo…"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
          <select
            className={FILTRO}
            value={filtroStato}
            onChange={(e) => setFiltroStato(e.target.value)}
          >
            <option value="">Tutti gli stati</option>
            {statiPresenti.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {materieDisponibili.length > 1 && (
            <select
              className={FILTRO}
              value={filtroMateria}
              onChange={(e) => setFiltroMateria(e.target.value)}
            >
              <option value="">Tutte le materie</option>
              {materieDisponibili.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <select
            className={FILTRO}
            value={ordine}
            onChange={(e) => {
              setOrdine(e.target.value);
              setOrdineInverso(false);
            }}
            aria-label="Ordina i quiz"
          >
            <option value="recenti">Più recenti</option>
            <option value="titolo">Titolo A–Z</option>
            <option value="stato">Per stato</option>
          </select>
          <BottoneVerso
            discendente={ordineDiscendente}
            onToggle={() => setOrdineInverso((v) => !v)}
          />
          {filtriAttivi && (
            <button type="button" className="text-xs font-medium text-primario" onClick={azzeraFiltri}>
              Azzera
            </button>
          )}
          {(ciSonoArchiviati || mostraArchiviati) && (
            <label className="ml-auto flex items-center gap-1.5 text-xs text-inchiostro/60">
              <input
                type="checkbox"
                className="accent-primario"
                checked={mostraArchiviati}
                onChange={(e) => setMostraArchiviati(e.target.checked)}
              />
              Mostra archiviati
            </label>
          )}
        </div>
      )}

      {caricamento ? (
        <p className="text-sm text-inchiostro/60">Caricamento…</p>
      ) : quiz.length === 0 ? (
        <div className="rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
          Nessun quiz. Inizia con «Crea nuovo quiz» — ti servirà almeno un{" "}
          <Link to="/docente/corsi" className="font-medium text-primario">
            corso
          </Link>
          .
        </div>
      ) : quizVisibili.length === 0 ? (
        <div className="rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
          {!mostraArchiviati && ciSonoArchiviati && !filtriAttivi
            ? "Tutti i tuoi quiz sono archiviati. Spunta «Mostra archiviati» per vederli."
            : "Nessun quiz corrisponde ai filtri."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {quizVisibili.map((q) => {
            const nQuesiti = q.quesiti?.length ?? 0;
            const cfgConferma =
              conferma?.id === q.id ? AZIONI_CONFERMA[conferma.tipo] : null;
            return (
              <li key={q.id} className="rounded-xl border border-bordo bg-superficie p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{q.titolo}</p>
                    <p className="mt-0.5 text-xs text-inchiostro/55">
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

                  {q.stato !== "bozza" && (
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      onClick={() => navigate(`/docente/quiz/${q.id}/risultati`)}
                    >
                      Risultati
                    </button>
                  )}

                  {(q.stato === "attivo" || q.stato === "chiuso") && (
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      onClick={() => setLinkAperto((v) => (v === q.id ? null : q.id))}
                    >
                      {linkAperto === q.id ? "Nascondi link" : "Link e QR per gli studenti"}
                    </button>
                  )}

                  {q.stato === "attivo" && (
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      onClick={() => setConferma({ tipo: "chiudi", id: q.id })}
                    >
                      Chiudi
                    </button>
                  )}

                  {q.stato === "chiuso" && (
                    <>
                      <button
                        type="button"
                        className={BOTTONE_PRIMARIO}
                        disabled={azioneInCorso}
                        onClick={() => esegui(() => riapriQuiz(q.id))}
                      >
                        Riapri
                      </button>
                      <button
                        type="button"
                        className={BOTTONE_SECONDARIO}
                        onClick={() => setConferma({ tipo: "archivia", id: q.id })}
                      >
                        Archivia
                      </button>
                    </>
                  )}

                  {q.stato === "archiviato" && (
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      disabled={azioneInCorso}
                      onClick={() => esegui(() => ripristinaQuiz(q.id))}
                    >
                      Ripristina
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
                {cfgConferma && (
                  <div className="mt-3 rounded-lg border border-bordo bg-sfondo p-3 text-sm">
                    <p className="mb-2">{cfgConferma.testo}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={BOTTONE_PRIMARIO}
                        disabled={azioneInCorso}
                        onClick={() => esegui(() => cfgConferma.fn(q.id))}
                      >
                        {azioneInCorso ? "Attendi…" : cfgConferma.conferma}
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

                {linkAperto === q.id && (q.stato === "attivo" || q.stato === "chiuso") && (
                  <div className="mt-3">
                    {q.stato === "chiuso" && (
                      <p className="mb-2 text-xs text-inchiostro/55">
                        Il quiz è chiuso: il link funziona solo dopo "Riapri".
                      </p>
                    )}
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
