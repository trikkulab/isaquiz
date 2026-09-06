// Lato docente — comporre un quiz: creare/scegliere quesiti dalla propria banca
// e salvarli come quiz in stato "bozza". L'avvio del quiz (stato "attivo") e la
// generazione di QR/link per gli studenti sono una fetta successiva, non qui.
//
// Stile "docente": sobrio e funzionale, priorità a leggibilità e densità di
// informazione (vedi CLAUDE.md, "Schermate docente"). Niente accesso diretto a
// Firestore: tutto passa dai repository in /data.

import { useEffect, useMemo, useState } from "react";

import { getUtenteCorrente } from "../../../data/mockAuth.js";
import { getCorsiDocente } from "../../../data/corsiRepository.js";
import { getQuesitiDocente, creaQuesito } from "../../../data/quesitiRepository.js";
import { creaQuiz } from "../../../data/quizRepository.js";

const CAMPO =
  "w-full rounded-lg border border-bordo bg-white px-3 py-2 text-sm outline-none focus:border-primario";
const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";
const BOTTONE_SECONDARIO =
  "rounded-lg border border-bordo bg-white px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario disabled:cursor-not-allowed disabled:opacity-40";

const OPZIONI_MIN = 2;
const OPZIONI_MAX = 6;

const FORM_VUOTO = {
  testo: "",
  opzioni: ["", ""],
  indiceCorretto: 0,
  argomento: "",
  spiegazione: "",
};

export default function CreaQuiz() {
  const utente = getUtenteCorrente();

  const [corsi, setCorsi] = useState([]);
  const [corsoId, setCorsoId] = useState("");
  const [banca, setBanca] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  const [titolo, setTitolo] = useState("");
  const [selezionati, setSelezionati] = useState([]); // array ordinato di quesitoId

  const [form, setForm] = useState(FORM_VUOTO);
  const [salvandoQuesito, setSalvandoQuesito] = useState(false);

  const [salvandoBozza, setSalvandoBozza] = useState(false);
  const [quizSalvato, setQuizSalvato] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const [corsiDocente, quesitiDocente] = await Promise.all([
          getCorsiDocente(utente.id),
          getQuesitiDocente(utente.id),
        ]);
        if (!attivo) return;
        setCorsi(corsiDocente);
        setCorsoId(corsiDocente[0]?.id ?? "");
        setBanca(quesitiDocente);
      } catch (err) {
        if (attivo) setErrore("Impossibile caricare corsi e quesiti. L'emulatore Firestore è avviato?");
        console.error(err);
      } finally {
        if (attivo) setCaricamento(false);
      }
    })();
    return () => {
      attivo = false;
    };
  }, [utente.id]);

  const corsoScelto = corsi.find((c) => c.id === corsoId) ?? null;
  const materiaCorso = corsoScelto?.materia ?? "";

  const quesitiNelQuiz = useMemo(
    () => selezionati.map((id) => banca.find((q) => q.id === id)).filter(Boolean),
    [selezionati, banca],
  );

  const bancaDisponibile = banca.filter((q) => !selezionati.includes(q.id));

  function aggiungiAlQuiz(id) {
    setSelezionati((prec) => (prec.includes(id) ? prec : [...prec, id]));
  }

  function rimuoviDalQuiz(id) {
    setSelezionati((prec) => prec.filter((x) => x !== id));
  }

  // --- form nuovo quesito ---------------------------------------------------

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

  async function salvaNuovoQuesito(e) {
    e.preventDefault();
    if (!formValido || salvandoQuesito) return;
    setSalvandoQuesito(true);
    setErrore(null);
    try {
      const opzioni = form.opzioni.map((o) => o.trim()).filter((o) => o !== "");
      const quesito = {
        testo: form.testo.trim(),
        opzioni,
        indiceCorretto: form.indiceCorretto,
        materia: materiaCorso || null,
        argomento: form.argomento.trim() || null,
        spiegazione: form.spiegazione.trim() || null,
        autoreId: utente.id,
      };
      const id = await creaQuesito(quesito);
      setBanca((prec) => [{ id, condivisa: false, fonte: "manuale", ...quesito }, ...prec]);
      aggiungiAlQuiz(id);
      setForm(FORM_VUOTO);
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
      const id = await creaQuiz({
        titolo: titolo.trim(),
        corsoId,
        docenteId: utente.id,
        quesiti: selezionati,
      });
      setQuizSalvato({ id });
    } catch (err) {
      setErrore("Salvataggio della bozza non riuscito.");
      console.error(err);
    } finally {
      setSalvandoBozza(false);
    }
  }

  function creaAltro() {
    setQuizSalvato(null);
    setTitolo("");
    setSelezionati([]);
    setForm(FORM_VUOTO);
  }

  // --- render ------------------------------------------------------------

  if (caricamento) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-[#1e1b2e]/60">Caricamento…</div>;
  }

  if (quizSalvato) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-xl border border-bordo bg-white p-6">
          <h1 className="mb-2 text-lg font-semibold">Bozza salvata</h1>
          <p className="mb-1 text-sm text-[#1e1b2e]/70">
            Il quiz «{titolo.trim()}» è stato salvato come bozza con {selezionati.length}{" "}
            {selezionati.length === 1 ? "quesito" : "quesiti"}.
          </p>
          <p className="mb-5 text-xs text-[#1e1b2e]/50">ID: {quizSalvato.id}</p>
          <button type="button" className={BOTTONE_PRIMARIO} onClick={creaAltro}>
            Crea un altro quiz
          </button>
        </div>
        <p className="mt-4 text-xs text-[#1e1b2e]/50">
          Avvio del quiz e QR per gli studenti: in arrivo nella prossima fase.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Crea quiz</h1>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
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
              <span className="font-normal text-[#1e1b2e]/50">({bancaDisponibile.length})</span>
            </h2>
            {bancaDisponibile.length === 0 ? (
              <p className="text-sm text-[#1e1b2e]/50">
                Nessun quesito disponibile. Creane uno qui sotto.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bancaDisponibile.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-bordo px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">{q.testo}</p>
                      <p className="mt-0.5 text-xs text-[#1e1b2e]/50">
                        {[q.materia, q.argomento].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={BOTTONE_SECONDARIO}
                      onClick={() => aggiungiAlQuiz(q.id)}
                    >
                      Aggiungi
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-bordo bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Nuovo quesito</h2>
            <form className="flex flex-col gap-3" onSubmit={salvaNuovoQuesito}>
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
                  <input className={`${CAMPO} bg-sfondo`} value={materiaCorso} disabled readOnly />
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

              <div>
                <button type="submit" className={BOTTONE_PRIMARIO} disabled={!formValido || salvandoQuesito}>
                  {salvandoQuesito ? "Salvataggio…" : "Aggiungi alla banca"}
                </button>
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
            <ol className="flex flex-col gap-2">
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
              {salvandoBozza ? "Salvataggio…" : "Salva bozza"}
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
