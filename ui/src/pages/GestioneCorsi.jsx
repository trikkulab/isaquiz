// Lato docente — i propri corsi e la creazione di uno nuovo (route
// /docente/corsi). Creazione "self-service": il docente crea il corso e si
// auto-assegna come titolare (vedi DECISIONI_DESIGN.md, "Onboarding docente e
// creazione corsi"). Modifica/disattivazione non previste qui in questa fase.
//
// Stile "docente": sobrio e funzionale. Niente accesso diretto a Firestore:
// tutto dai repository in /data.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import CampoCombobox from "../components/CampoCombobox.jsx";
import { coloreMateria } from "../utils/colori.js";
import {
  getCorsiDocente,
  getMaterieEsistenti,
  getClassiEsistenti,
  creaCorso,
} from "../../../data/corsiRepository.js";

const BOTTONE_PRIMARIO =
  "rounded-lg bg-primario px-4 py-2 text-sm font-semibold text-su-primario transition-colors hover:bg-primario-scuro disabled:cursor-not-allowed disabled:opacity-40";

export default function GestioneCorsi() {
  const utente = useUtenteCorrente();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ritornoACreaQuiz = params.get("ritorno") === "crea-quiz";

  const [corsi, setCorsi] = useState([]);
  const [materie, setMaterie] = useState([]);
  const [classi, setClassi] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  const [materia, setMateria] = useState("");
  const [classe, setClasse] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function ricarica() {
    try {
      const [miei, materieEs, classiEs] = await Promise.all([
        getCorsiDocente(utente.id),
        getMaterieEsistenti(),
        getClassiEsistenti(),
      ]);
      setCorsi(miei);
      setMaterie(materieEs);
      setClassi(classiEs);
    } catch (err) {
      setErrore("Impossibile caricare i corsi. L'emulatore Firestore è avviato?");
      console.error(err);
    } finally {
      setCaricamento(false);
    }
  }

  useEffect(() => {
    ricarica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utente.id]);

  const puoCreare = materia.trim() !== "" && classe.trim() !== "" && !salvando;

  async function crea(e) {
    e.preventDefault();
    if (!puoCreare) return;
    setSalvando(true);
    setErrore(null);
    try {
      await creaCorso({ materia, classeId: classe, docenteId: utente.id });
      setMateria("");
      setClasse("");
      await ricarica();
    } catch (err) {
      setErrore(err.message || "Creazione del corso non riuscita.");
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  const corsiOrdinati = useMemo(
    () =>
      [...corsi].sort(
        (a, b) =>
          (a.materia || "").localeCompare(b.materia || "", "it") ||
          (a.classeId || "").localeCompare(b.classeId || "", "it"),
      ),
    [corsi],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">I miei corsi</h1>

      {errore && (
        <div className="mb-4 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          {errore}
        </div>
      )}

      {ritornoACreaQuiz && (
        <div className="mb-4 rounded-lg border border-bordo bg-sfondo px-3 py-2 text-sm text-inchiostro/70">
          Crea un corso, poi{" "}
          <Link to="/docente/crea-quiz" className="font-medium text-primario">
            torna a creare il quiz
          </Link>
          .
        </div>
      )}

      <section className="mb-6 rounded-xl border border-bordo bg-superficie p-4">
        <h2 className="mb-3 text-sm font-semibold">Nuovo corso</h2>
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={crea}>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-inchiostro/60">Materia</span>
            <CampoCombobox
              id="corso-materia"
              value={materia}
              onChange={setMateria}
              opzioni={materie}
              placeholder="Es. Informatica"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-inchiostro/60">Classe</span>
            <CampoCombobox
              id="corso-classe"
              value={classe}
              onChange={setClasse}
              opzioni={classi}
              placeholder="Es. 3AINF"
            />
          </label>
          <button type="submit" className={BOTTONE_PRIMARIO} disabled={!puoCreare}>
            {salvando ? "Creazione…" : "Crea corso"}
          </button>
        </form>
        <p className="mt-2 text-xs text-inchiostro/50">
          L'anno scolastico è quello corrente dell'istituto. Sarai il docente
          titolare del corso.
        </p>
      </section>

      {caricamento ? (
        <p className="text-sm text-inchiostro/60">Caricamento…</p>
      ) : corsiOrdinati.length === 0 ? (
        <div className="rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
          Nessun corso. Creane uno qui sopra per poter comporre dei quiz.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {corsiOrdinati.map((c) => (
            <li
              key={c.id}
              className={`flex items-start justify-between gap-3 rounded-xl border-y border-r border-l-[3px] border-y-bordo border-r-bordo bg-superficie p-4 ${coloreMateria(
                c.materia
              )}`}
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {c.materia} — {c.classeId}
                </p>
                <p className="mt-0.5 text-xs text-inchiostro/55">
                  {[
                    c.annoScolastico,
                    c.ruolo,
                    c.codiceAccesso && `codice ${c.codiceAccesso}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  className="text-xs font-medium text-primario"
                  onClick={() => navigate("/docente/crea-quiz")}
                >
                  Crea un quiz →
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-primario"
                  onClick={() => navigate(`/docente/corsi/${c.id}/andamento`)}
                >
                  Andamento →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
