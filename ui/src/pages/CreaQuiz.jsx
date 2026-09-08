// Lato docente — comporre un quiz: creare/scegliere quesiti dalla propria banca
// e salvarli come quiz in stato "bozza". L'avvio del quiz (stato "attivo") e la
// generazione di QR/link per gli studenti sono una fetta successiva, non qui.
//
// Stile "docente": sobrio e funzionale, priorità a leggibilità e densità di
// informazione (vedi CLAUDE.md, "Schermate docente"). Niente accesso diretto a
// Firestore: tutto passa dai repository in /data.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AccessoQuiz from "../components/AccessoQuiz.jsx";
import BottoneVerso from "../components/BottoneVerso.jsx";
import { getUtenteCorrente } from "../../../data/mockAuth.js";
import { getCorsiDocente } from "../../../data/corsiRepository.js";
import {
  getBancaDocente,
  creaQuesito,
  salvaNuovaVersione,
  forkQuesito,
  impostaAttivoQuesito,
} from "../../../data/quesitiRepository.js";
import {
  creaQuiz,
  avviaQuiz,
  getQuizConQuesiti,
  aggiornaQuizBozza,
} from "../../../data/quizRepository.js";

const CAMPO =
  "w-full rounded-lg border border-bordo bg-white px-3 py-2 text-sm outline-none focus:border-primario";
const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";
const BOTTONE_SECONDARIO =
  "rounded-lg border border-bordo bg-white px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario disabled:cursor-not-allowed disabled:opacity-40";
const FILTRO =
  "rounded-lg border border-bordo bg-white px-2.5 py-1.5 text-xs outline-none focus:border-primario disabled:opacity-40";

const FILTRI_VUOTI = { materia: "", argomento: "", cerca: "" };

const dataMs = (x) => x?.creato?.toMillis?.() ?? 0;
const perTesto = (a, b) => (a.testo || "").localeCompare(b.testo || "", "it");

// Ordinamento della banca quesiti + verso "naturale" di ciascun criterio
// (quello che si applica prima di invertire con BottoneVerso).
const VERSO_NATURALE_BANCA = { recenti: "desc", testo: "asc", argomento: "asc" };
function comparatoreQuesiti(ordine) {
  if (ordine === "testo") return perTesto;
  if (ordine === "argomento") {
    return (a, b) => {
      const av = a.argomento || "";
      const bv = b.argomento || "";
      if (!av !== !bv) return av ? -1 : 1; // quesiti senza argomento in fondo
      return av.localeCompare(bv, "it") || perTesto(a, b);
    };
  }
  return (a, b) => dataMs(b) - dataMs(a); // "recenti"
}

const OPZIONI_MIN = 2;
const OPZIONI_MAX = 6;

const FORM_VUOTO = {
  testo: "",
  opzioni: ["", ""],
  indiceCorretto: 0,
  argomento: "",
  spiegazione: "",
  materia: "", // vuoto = usa quella del corso selezionato (default)
};

export default function CreaQuiz() {
  const utente = getUtenteCorrente();
  const navigate = useNavigate();
  const { quizId } = useParams(); // presente = si modifica una bozza esistente

  const [corsi, setCorsi] = useState([]);
  const [corsoId, setCorsoId] = useState("");
  const [banca, setBanca] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [bloccato, setBloccato] = useState(null); // messaggio se la bozza non è modificabile

  const [titolo, setTitolo] = useState("");
  const [selezionati, setSelezionati] = useState([]); // array ordinato di quesitoId
  // Quesiti del quiz caricato che potrebbero non essere nella banca (versioni
  // non più "ultime"): pool di fallback per risolverli in "Quesiti nel quiz".
  const [quesitiCaricati, setQuesitiCaricati] = useState([]);
  const [avviso, setAvviso] = useState(null);

  const [form, setForm] = useState(FORM_VUOTO);
  // Quesito caricato nel form dalla banca (per nuova versione / duplica).
  // null = si sta scrivendo un quesito nuovo da zero.
  const [quesitoBase, setQuesitoBase] = useState(null);
  const [salvandoQuesito, setSalvandoQuesito] = useState(false);
  const formRef = useRef(null);

  const [salvandoBozza, setSalvandoBozza] = useState(false);
  // Dopo "Salva bozza": { id, stato, titolo, numQuesiti }. `stato` passa da
  // "bozza" ad "attivo" quando il docente pubblica.
  const [quizSalvato, setQuizSalvato] = useState(null);
  const [confermaAvvio, setConfermaAvvio] = useState(false);
  const [avviando, setAvviando] = useState(false);
  const [errore, setErrore] = useState(null);

  const [filtri, setFiltri] = useState(FILTRI_VUOTI);
  const [ordineBanca, setOrdineBanca] = useState("recenti");
  const [bancaInverso, setBancaInverso] = useState(false);
  const [mostraInattivi, setMostraInattivi] = useState(false);

  useEffect(() => {
    let attivo = true;
    (async () => {
      // Re-init completo a ogni cambio di rotta (nuovo / modifica / altra bozza).
      setCaricamento(true);
      setBloccato(null);
      setErrore(null);
      setAvviso(null);
      setQuizSalvato(null);
      setTitolo("");
      setSelezionati([]);
      setQuesitiCaricati([]);
      setForm(FORM_VUOTO);
      setQuesitoBase(null);

      try {
        const [corsiDocente, quesitiDocente] = await Promise.all([
          getCorsiDocente(utente.id),
          // include anche gli inattivi: il filtro visibilità è client-side (toggle)
          getBancaDocente(utente.id, { includiInattivi: true }),
        ]);
        if (!attivo) return;
        setCorsi(corsiDocente);
        setBanca(quesitiDocente);

        if (!quizId) {
          setCorsoId(corsiDocente[0]?.id ?? "");
          return;
        }

        // --- modifica di una bozza esistente ---
        const q = await getQuizConQuesiti(quizId);
        if (!attivo) return;
        if (!q) return setBloccato("Quiz non trovato.");
        if (q.autoreId !== utente.id) return setBloccato("Non puoi modificare un quiz di un altro docente.");
        if (q.stato !== "bozza")
          return setBloccato("Questo quiz è già stato avviato: non è più modificabile.");

        // I quesiti del quiz vengono "aggiornati" all'ultima versione del loro
        // baseId (una bozza si compone sempre dalla banca corrente).
        const ultimaPerBase = new Map(quesitiDocente.map((b) => [b.baseId, b]));
        const ids = q.quesiti.map((qq) => ultimaPerBase.get(qq.baseId)?.id ?? qq.id);
        const nAggiornati = ids.filter((id, i) => id !== q.quesiti[i].id).length;

        setTitolo(q.titolo ?? "");
        setCorsoId(q.corsoId ?? corsiDocente[0]?.id ?? "");
        setSelezionati(ids);
        setQuesitiCaricati(q.quesiti);
        if (nAggiornati > 0)
          setAvviso(
            `${nAggiornati} ${nAggiornati === 1 ? "quesito aggiornato" : "quesiti aggiornati"} all'ultima versione.`,
          );
      } catch (err) {
        if (attivo) setErrore("Impossibile caricare i dati. L'emulatore Firestore è avviato?");
        console.error(err);
      } finally {
        if (attivo) setCaricamento(false);
      }
    })();
    return () => {
      attivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente.id, quizId]);

  const corsoScelto = corsi.find((c) => c.id === corsoId) ?? null;
  const materiaCorso = corsoScelto?.materia ?? "";

  const quesitiNelQuiz = useMemo(
    () =>
      selezionati
        .map(
          (id) =>
            banca.find((q) => q.id === id) || quesitiCaricati.find((q) => q.id === id),
        )
        .filter(Boolean),
    [selezionati, banca, quesitiCaricati],
  );

  // Quesiti non ancora nel quiz — base per i filtri della banca. Gli inattivi
  // (`attivo === false`; un quesito senza il campo è attivo) sono nascosti
  // salvo toggle esplicito.
  const nonSelezionati = useMemo(
    () =>
      banca.filter(
        (q) => !selezionati.includes(q.id) && (mostraInattivi || q.attivo !== false),
      ),
    [banca, selezionati, mostraInattivi],
  );

  const materieDisponibili = useMemo(
    () => [...new Set(nonSelezionati.map((q) => q.materia).filter(Boolean))].sort(),
    [nonSelezionati],
  );

  const argomentiDisponibili = useMemo(
    () =>
      [
        ...new Set(
          nonSelezionati
            .filter((q) => !filtri.materia || q.materia === filtri.materia)
            .map((q) => q.argomento)
            .filter(Boolean),
        ),
      ].sort(),
    [nonSelezionati, filtri.materia],
  );

  const bancaDisponibile = useMemo(() => {
    const cerca = filtri.cerca.trim().toLowerCase();
    const filtrati = nonSelezionati.filter((q) => {
      if (filtri.materia && q.materia !== filtri.materia) return false;
      if (filtri.argomento && q.argomento !== filtri.argomento) return false;
      if (cerca) {
        const inTesto = q.testo?.toLowerCase().includes(cerca);
        const inOpzioni = q.opzioni?.some((o) => o.toLowerCase().includes(cerca));
        if (!inTesto && !inOpzioni) return false;
      }
      return true;
    });
    const cmp = comparatoreQuesiti(ordineBanca);
    return filtrati.sort(bancaInverso ? (a, b) => -cmp(a, b) : cmp);
  }, [nonSelezionati, filtri, ordineBanca, bancaInverso]);

  const bancaDiscendente =
    (VERSO_NATURALE_BANCA[ordineBanca] === "desc") !== bancaInverso;

  const filtriAttivi = Boolean(filtri.materia || filtri.argomento || filtri.cerca.trim());

  function aggiungiAlQuiz(id) {
    setSelezionati((prec) => (prec.includes(id) ? prec : [...prec, id]));
  }

  function rimuoviDalQuiz(id) {
    setSelezionati((prec) => prec.filter((x) => x !== id));
  }

  async function cambiaAttivo(q, attivo) {
    setErrore(null);
    try {
      await impostaAttivoQuesito(q.id, attivo);
      setBanca((prec) => prec.map((x) => (x.id === q.id ? { ...x, attivo } : x)));
    } catch (err) {
      setErrore(
        attivo ? "Riattivazione non riuscita." : "Disattivazione non riuscita.",
      );
      console.error(err);
    }
  }

  // --- form quesito (nuovo / nuova versione / duplica) ---------------------

  // Materia del quesito: pre-selezionata sulla materia del corso corrente
  // (form.materia vuoto), ma il docente può cambiarla scegliendo tra le materie
  // già note. Le opzioni sono l'unione (deduplicata, ordinata) delle materie
  // dei corsi del docente e di quelle già presenti nella sua banca quesiti —
  // incluse quelle di anni passati che restano in banca. Nessuna lettura extra.
  const opzioniMateria = useMemo(() => {
    const set = new Set();
    for (const c of corsi) if (c.materia) set.add(c.materia);
    for (const q of banca) if (q.materia) set.add(q.materia);
    return [...set].sort((a, b) => a.localeCompare(b, "it"));
  }, [corsi, banca]);

  const materiaEffettiva = form.materia || materiaCorso;
  const autoreDiverso = Boolean(quesitoBase && quesitoBase.autoreId !== utente.id);

  function caricaNelForm(q) {
    setQuesitoBase(q);
    setForm({
      testo: q.testo ?? "",
      opzioni: q.opzioni?.length ? [...q.opzioni] : ["", ""],
      indiceCorretto: q.indiceCorretto ?? 0,
      argomento: q.argomento ?? "",
      spiegazione: q.spiegazione ?? "",
      materia: q.materia ?? "",
    });
    setErrore(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function nuovoQuesitoDaZero() {
    setQuesitoBase(null);
    setForm(FORM_VUOTO);
  }

  function setOpzione(indice, valore) {
    setForm((f) => ({
      ...f,
      opzioni: f.opzioni.map((o, i) => (i === indice ? valore : o)),
    }));
  }

  function aggiungiOpzione() {
    setForm((f) =>
      f.opzioni.length >= OPZIONI_MAX ? f : { ...f, opzioni: [...f.opzioni, ""] },
    );
  }

  function rimuoviOpzione(indice) {
    setForm((f) => {
      if (f.opzioni.length <= OPZIONI_MIN) return f;
      const opzioni = f.opzioni.filter((_, i) => i !== indice);
      let indiceCorretto = f.indiceCorretto;
      if (indice === indiceCorretto) indiceCorretto = 0;
      else if (indice < indiceCorretto) indiceCorretto -= 1;
      return { ...f, opzioni, indiceCorretto };
    });
  }

  const formValido =
    form.testo.trim() !== "" &&
    form.opzioni.filter((o) => o.trim() !== "").length >= OPZIONI_MIN &&
    form.opzioni[form.indiceCorretto]?.trim() !== "";

  // Campi di contenuto dal form: scarta le opzioni vuote riallineando l'indice
  // della corretta.
  function contenutoDalForm() {
    const coppie = form.opzioni
      .map((o, i) => ({ testo: o.trim(), corretta: i === form.indiceCorretto }))
      .filter((c) => c.testo !== "");
    return {
      testo: form.testo.trim(),
      opzioni: coppie.map((c) => c.testo),
      indiceCorretto: Math.max(0, coppie.findIndex((c) => c.corretta)),
      materia: materiaEffettiva || null,
      argomento: form.argomento.trim() || null,
      spiegazione: form.spiegazione.trim() || null,
    };
  }

  // Azione "primaria" del form (Invio / bottone principale):
  //   nessun quesito caricato -> crea nuovo   |  autore diverso -> duplica
  //   autore = utente corrente               -> nuova versione
  function azionePrimaria() {
    if (!quesitoBase) return "nuovo";
    return autoreDiverso ? "fork" : "versione";
  }

  async function eseguiSalvataggioQuesito(azione) {
    if (!formValido || salvandoQuesito) return;
    setSalvandoQuesito(true);
    setErrore(null);
    try {
      const contenuto = contenutoDalForm();

      if (azione === "versione") {
        const nuovoId = await salvaNuovaVersione(quesitoBase, contenuto);
        // Se la versione precedente era già nel quiz, il quiz punta alla nuova.
        setSelezionati((prec) => prec.map((id) => (id === quesitoBase.id ? nuovoId : id)));
      } else if (azione === "fork") {
        const nuovoId = await forkQuesito(quesitoBase, contenuto, utente.id);
        aggiungiAlQuiz(nuovoId);
      } else {
        const nuovoId = await creaQuesito({ ...contenuto, autoreId: utente.id });
        aggiungiAlQuiz(nuovoId);
      }

      // Banca riletta dalla fonte di verità (raggruppata per baseId): evita
      // ogni ricostruzione ottimistica di baseId/versione lato client.
      setBanca(await getBancaDocente(utente.id, { includiInattivi: true }));
      nuovoQuesitoDaZero();
    } catch (err) {
      setErrore("Salvataggio del quesito non riuscito.");
      console.error(err);
    } finally {
      setSalvandoQuesito(false);
    }
  }

  // --- salva bozza --------------------------------------------------------

  const bozzaValida = titolo.trim() !== "" && corsoId !== "" && selezionati.length >= 1;

  async function salvaBozza() {
    if (!bozzaValida || salvandoBozza) return;
    setSalvandoBozza(true);
    setErrore(null);
    try {
      const datiQuiz = { titolo: titolo.trim(), corsoId, quesiti: selezionati };
      let id = quizId;
      if (quizId) {
        await aggiornaQuizBozza(quizId, datiQuiz);
      } else {
        id = await creaQuiz({ ...datiQuiz, docenteId: utente.id });
      }
      setQuizSalvato({
        id,
        stato: "bozza",
        titolo: titolo.trim(),
        numQuesiti: selezionati.length,
        modificata: Boolean(quizId),
      });
    } catch (err) {
      setErrore(err.message || "Salvataggio della bozza non riuscito.");
      console.error(err);
    } finally {
      setSalvandoBozza(false);
    }
  }

  async function avvia() {
    if (avviando || quizSalvato?.stato !== "bozza") return;
    setAvviando(true);
    setErrore(null);
    try {
      const stato = await avviaQuiz(quizSalvato.id);
      setQuizSalvato((s) => ({ ...s, stato }));
      setConfermaAvvio(false);
    } catch (err) {
      setErrore("Avvio del quiz non riuscito.");
      console.error(err);
    } finally {
      setAvviando(false);
    }
  }

  function creaAltro() {
    // Se si stava modificando una bozza, la rotta ha :quizId — si va sul path
    // "nuovo" e l'effect ri-inizializza tutto.
    if (quizId) {
      navigate("/docente/crea-quiz");
      return;
    }
    setQuizSalvato(null);
    setConfermaAvvio(false);
    setTitolo("");
    setSelezionati([]);
    nuovoQuesitoDaZero();
  }

  // --- render ------------------------------------------------------------

  if (caricamento) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-[#1e1b2e]/60">Caricamento…</div>;
  }

  if (bloccato) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-xl border border-bordo bg-white p-6">
          <p className="mb-4 text-sm text-[#1e1b2e]/70">{bloccato}</p>
          <button
            type="button"
            className={BOTTONE_SECONDARIO}
            onClick={() => navigate("/docente")}
          >
            I miei quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizSalvato) {
    const attivo = quizSalvato.stato === "attivo";

    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        {errore && (
          <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
            {errore}
          </div>
        )}

        <div className="rounded-xl border border-bordo bg-white p-6">
          <h1 className="mb-2 text-lg font-semibold">
            {attivo ? "Quiz avviato" : quizSalvato.modificata ? "Bozza aggiornata" : "Bozza salvata"}
          </h1>
          <p className="mb-1 text-sm text-[#1e1b2e]/70">
            «{quizSalvato.titolo}» — {quizSalvato.numQuesiti}{" "}
            {quizSalvato.numQuesiti === 1 ? "quesito" : "quesiti"}
          </p>
          <p className="mb-5 text-xs text-[#1e1b2e]/50">ID: {quizSalvato.id}</p>

          {attivo ? (
            <div className="mb-5">
              <AccessoQuiz quizId={quizSalvato.id} />
            </div>
          ) : confermaAvvio ? (
            <div className="mb-5 rounded-lg border border-bordo bg-sfondo p-4">
              <p className="mb-3 text-sm">
                Una volta avviato, il quiz <strong>non è più modificabile</strong> e non
                si può cancellare. Procedo?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={BOTTONE_PRIMARIO}
                  onClick={avvia}
                  disabled={avviando}
                >
                  {avviando ? "Avvio…" : "Sì, avvia il quiz"}
                </button>
                <button
                  type="button"
                  className={BOTTONE_SECONDARIO}
                  onClick={() => setConfermaAvvio(false)}
                  disabled={avviando}
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`${BOTTONE_PRIMARIO} mb-3 block`}
              onClick={() => setConfermaAvvio(true)}
            >
              Pubblica e avvia il quiz
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={BOTTONE_SECONDARIO} onClick={creaAltro}>
              Crea un altro quiz
            </button>
            <button
              type="button"
              className={BOTTONE_SECONDARIO}
              onClick={() => navigate("/docente")}
            >
              I miei quiz
            </button>
          </div>
        </div>

        {!attivo && (
          <p className="mt-4 text-xs text-[#1e1b2e]/50">
            La bozza resta salvata: la ritrovi (per avviarla o eliminarla) in «I miei quiz».
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">{quizId ? "Modifica quiz" : "Crea quiz"}</h1>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
        </div>
      )}

      {avviso && (
        <div className="mb-4 rounded-lg border border-bordo bg-sfondo px-3 py-2 text-xs text-[#1e1b2e]/70">
          {avviso}
        </div>
      )}

      {/* Dati del quiz */}
      <section className="mb-6 grid gap-4 rounded-xl border border-bordo bg-white p-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#1e1b2e]/60">Corso</span>
          <select className={CAMPO} value={corsoId} onChange={(e) => setCorsoId(e.target.value)}>
            {corsi.length === 0 && <option value="">Nessun corso</option>}
            {corsi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.materia} — {c.classeId} ({c.annoScolastico})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#1e1b2e]/60">Titolo del quiz</span>
          <input
            className={CAMPO}
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            placeholder="Es. Verifica: il Rinascimento"
          />
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonna A — banca + nuovo quesito */}
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-bordo bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">
              Banca quesiti{" "}
              <span className="font-normal text-[#1e1b2e]/50">
                ({filtriAttivi
                  ? `${bancaDisponibile.length} di ${nonSelezionati.length}`
                  : bancaDisponibile.length})
              </span>
            </h2>

            {/* Filtri della banca. "Per docente" arriverà con la banca condivisa
                (Fase 4): oggi la banca contiene solo i quesiti di chi è loggato. */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                className={`${FILTRO} min-w-[140px] flex-1`}
                placeholder="Cerca nel testo o nelle opzioni…"
                value={filtri.cerca}
                onChange={(e) => setFiltri((f) => ({ ...f, cerca: e.target.value }))}
              />
              <select
                className={FILTRO}
                value={filtri.materia}
                onChange={(e) => setFiltri((f) => ({ ...f, materia: e.target.value, argomento: "" }))}
              >
                <option value="">Tutte le materie</option>
                {materieDisponibili.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className={FILTRO}
                value={filtri.argomento}
                onChange={(e) => setFiltri((f) => ({ ...f, argomento: e.target.value }))}
                disabled={argomentiDisponibili.length === 0}
              >
                <option value="">Tutti gli argomenti</option>
                {argomentiDisponibili.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                className={FILTRO}
                value={ordineBanca}
                onChange={(e) => {
                  setOrdineBanca(e.target.value);
                  setBancaInverso(false);
                }}
                aria-label="Ordina la banca"
              >
                <option value="recenti">Più recenti</option>
                <option value="testo">Testo A–Z</option>
                <option value="argomento">Argomento</option>
              </select>
              <BottoneVerso
                discendente={bancaDiscendente}
                onToggle={() => setBancaInverso((v) => !v)}
              />
              {filtriAttivi && (
                <button
                  type="button"
                  className="text-xs font-medium text-primario"
                  onClick={() => setFiltri(FILTRI_VUOTI)}
                >
                  Azzera
                </button>
              )}
              <label className="ml-auto flex items-center gap-1.5 text-xs text-[#1e1b2e]/60">
                <input
                  type="checkbox"
                  className="accent-primario"
                  checked={mostraInattivi}
                  onChange={(e) => setMostraInattivi(e.target.checked)}
                />
                Mostra inattivi
              </label>
            </div>

            {nonSelezionati.length === 0 ? (
              <p className="text-sm text-[#1e1b2e]/50">
                {!mostraInattivi && banca.some((q) => q.attivo === false)
                  ? "Nessun quesito attivo. Spunta «Mostra inattivi» o creane uno qui sotto."
                  : "Nessun quesito disponibile. Creane uno qui sotto."}
              </p>
            ) : bancaDisponibile.length === 0 ? (
              <p className="text-sm text-[#1e1b2e]/50">Nessun quesito corrisponde ai filtri.</p>
            ) : (
              <div className="h-[420px] min-h-[160px] max-h-[75vh] resize-y overflow-auto pr-1">
                {/* Altezza regolabile dall'utente (maniglia di resize nativa,
                    solo desktop): la banca puo' essere lunga e ci si sfoglia
                    mentre si compone il quiz. Non persistita tra i reload. */}
                <ul className="flex flex-col gap-2">
                  {bancaDisponibile.map((q) => {
                    const inattivo = q.attivo === false;
                    return (
                      <li
                        key={q.id}
                        className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${
                          quesitoBase?.id === q.id
                            ? "border-primario ring-1 ring-primario"
                            : "border-bordo"
                        } ${inattivo ? "opacity-60" : ""}`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => caricaNelForm(q)}
                          title="Apri nel form per una nuova versione o una copia"
                        >
                          <p className="text-sm">
                            {inattivo && (
                              <span className="mr-1.5 rounded bg-[#1e1b2e]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1e1b2e]/55">
                                inattivo
                              </span>
                            )}
                            {q.testo}
                          </p>
                          <p className="mt-0.5 text-xs text-[#1e1b2e]/50">
                            {[q.materia, q.argomento].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {inattivo ? (
                            <button
                              type="button"
                              className={BOTTONE_SECONDARIO}
                              onClick={() => cambiaAttivo(q, true)}
                            >
                              Riattiva
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={BOTTONE_SECONDARIO}
                                onClick={() => aggiungiAlQuiz(q.id)}
                              >
                                Aggiungi
                              </button>
                              <button
                                type="button"
                                className="text-xs font-medium text-[#1e1b2e]/45 hover:text-errore"
                                onClick={() => cambiaAttivo(q, false)}
                              >
                                Disattiva
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <section ref={formRef} className="scroll-mt-6 rounded-xl border border-bordo bg-white p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {quesitoBase ? "Modifica quesito" : "Nuovo quesito"}
              </h2>
              {quesitoBase && (
                <button
                  type="button"
                  className="text-xs font-medium text-primario"
                  onClick={nuovoQuesitoDaZero}
                >
                  Nuovo quesito da zero
                </button>
              )}
            </div>

            {quesitoBase && (
              <p className="mb-3 rounded-lg bg-sfondo px-3 py-2 text-xs text-[#1e1b2e]/60">
                Versione {quesitoBase.versione ?? 0} · autore:{" "}
                {autoreDiverso ? "un altro docente" : "tu"}
              </p>
            )}

            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                eseguiSalvataggioQuesito(azionePrimaria());
              }}
            >
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#1e1b2e]/60">Testo</span>
                <textarea
                  className={`${CAMPO} resize-y`}
                  rows={2}
                  value={form.testo}
                  onChange={(e) => setForm((f) => ({ ...f, testo: e.target.value }))}
                />
              </label>

              <div>
                <span className="mb-1 block text-xs font-medium text-[#1e1b2e]/60">
                  Opzioni (seleziona quella corretta)
                </span>
                <div className="flex flex-col gap-2">
                  {form.opzioni.map((opzione, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="corretta"
                        className="accent-primario"
                        checked={form.indiceCorretto === i}
                        onChange={() => setForm((f) => ({ ...f, indiceCorretto: i }))}
                        aria-label={`Opzione ${i + 1} corretta`}
                      />
                      <input
                        className={CAMPO}
                        value={opzione}
                        onChange={(e) => setOpzione(i, e.target.value)}
                        placeholder={`Opzione ${i + 1}`}
                      />
                      <button
                        type="button"
                        className="px-1 text-lg leading-none text-[#1e1b2e]/40 hover:text-errore disabled:opacity-30"
                        onClick={() => rimuoviOpzione(i)}
                        disabled={form.opzioni.length <= OPZIONI_MIN}
                        aria-label={`Rimuovi opzione ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-primario disabled:opacity-40"
                  onClick={aggiungiOpzione}
                  disabled={form.opzioni.length >= OPZIONI_MAX}
                >
                  + Aggiungi opzione
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#1e1b2e]/60">Argomento</span>
                  <input
                    className={CAMPO}
                    value={form.argomento}
                    onChange={(e) => setForm((f) => ({ ...f, argomento: e.target.value }))}
                    placeholder="Es. Mecenatismo"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#1e1b2e]/60">Materia</span>
                  <select
                    className={CAMPO}
                    value={materiaEffettiva}
                    onChange={(e) => setForm((f) => ({ ...f, materia: e.target.value }))}
                  >
                    {materiaEffettiva && !opzioniMateria.includes(materiaEffettiva) && (
                      <option value={materiaEffettiva}>{materiaEffettiva}</option>
                    )}
                    {opzioniMateria.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#1e1b2e]/60">
                  Spiegazione (opzionale)
                </span>
                <textarea
                  className={`${CAMPO} resize-y`}
                  rows={2}
                  value={form.spiegazione}
                  onChange={(e) => setForm((f) => ({ ...f, spiegazione: e.target.value }))}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {!quesitoBase && (
                  <button
                    type="submit"
                    className={BOTTONE_PRIMARIO}
                    disabled={!formValido || salvandoQuesito}
                  >
                    {salvandoQuesito ? "Salvataggio…" : "Aggiungi alla banca"}
                  </button>
                )}

                {quesitoBase && !autoreDiverso && (
                  <>
                    <button
                      type="submit"
                      className={BOTTONE_PRIMARIO}
                      disabled={!formValido || salvandoQuesito}
                    >
                      {salvandoQuesito ? "Salvataggio…" : "Salva nuova versione"}
                    </button>
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      disabled={!formValido || salvandoQuesito}
                      onClick={() => eseguiSalvataggioQuesito("fork")}
                    >
                      Duplica come nuovo quesito
                    </button>
                  </>
                )}

                {quesitoBase && autoreDiverso && (
                  <button
                    type="submit"
                    className={BOTTONE_PRIMARIO}
                    disabled={!formValido || salvandoQuesito}
                  >
                    {salvandoQuesito ? "Salvataggio…" : "Duplica come mio quesito"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>

        {/* Colonna B — quesiti nel quiz */}
        <section className="rounded-xl border border-bordo bg-white p-4 lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-3 text-sm font-semibold">
            Quesiti nel quiz{" "}
            <span className="font-normal text-[#1e1b2e]/50">({quesitiNelQuiz.length})</span>
          </h2>

          {quesitiNelQuiz.length === 0 ? (
            <p className="text-sm text-[#1e1b2e]/50">
              Aggiungi quesiti dalla banca o creane di nuovi.
            </p>
          ) : (
            <ol className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
              {quesitiNelQuiz.map((q, i) => (
                <li
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-bordo px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="text-[#1e1b2e]/40">{i + 1}.</span> {q.testo}
                    </p>
                    <p className="mt-0.5 text-xs text-[#1e1b2e]/50">
                      {[q.materia, q.argomento].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-1 text-lg leading-none text-[#1e1b2e]/40 hover:text-errore"
                    onClick={() => rimuoviDalQuiz(q.id)}
                    aria-label="Rimuovi dal quiz"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-4 border-t border-bordo pt-4">
            <button
              type="button"
              className={`${BOTTONE_PRIMARIO} w-full`}
              onClick={salvaBozza}
              disabled={!bozzaValida || salvandoBozza}
            >
              {salvandoBozza ? "Salvataggio…" : quizId ? "Salva modifiche" : "Salva bozza"}
            </button>
            {!bozzaValida && (
              <p className="mt-2 text-xs text-[#1e1b2e]/50">
                Servono un titolo, un corso e almeno un quesito.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
