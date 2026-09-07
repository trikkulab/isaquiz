// Home dello studente (route /studente). Post-login (Fase 2) sarà la pagina a
// cui si arriva dopo l'accesso; per ora usa la mock auth. Da qui: partecipare
// a un quiz col codice, e (in futuro) vedere le proprie statistiche.
//
// Stile "studente": più vivo e accogliente delle schermate docente (vedi
// CLAUDE.md, "Schermate studente"), ma leggero e velocissimo.

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUtenteCorrente } from "../../../data/mockAuth.js";
import {
  getQuizIdDaCodice,
  normalizzaCodice,
} from "../../../data/codiciAccessoRepository.js";

export default function StudenteHome() {
  const studente = getUtenteCorrente("studente");
  const navigate = useNavigate();

  const [codice, setCodice] = useState("");
  const [verifica, setVerifica] = useState(false);
  const [errore, setErrore] = useState(null);

  // Nessun controllo di lunghezza qui: basta che sia non vuoto. La validità
  // vera è "corrisponde a un quiz" e la stabilisce getQuizIdDaCodice.
  const puoEntrare = codice.length > 0 && !verifica;

  async function partecipa(e) {
    e.preventDefault();
    if (!puoEntrare) return;
    setVerifica(true);
    setErrore(null);
    try {
      const quizId = await getQuizIdDaCodice(codice);
      if (!quizId) {
        setErrore("Codice non valido.");
        return;
      }
      navigate(`/quiz/${quizId}`);
    } catch (err) {
      setErrore("Non è stato possibile verificare il codice.");
      console.error(err);
    } finally {
      setVerifica(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-4 py-8">
      <header className="mb-8 flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primario/15 text-2xl"
          aria-hidden="true"
        >
          {studente.avatarEmoji || "🙂"}
        </span>
        <div>
          <p className="font-titoli text-lg font-bold">Ciao {studente.nickname || studente.nome}!</p>
          <p className="text-xs text-[#1e1b2e]/55">{studente.classeId}</p>
        </div>
      </header>

      <section className="rounded-[22px] bg-gradient-to-br from-primario to-primario-scuro p-6 text-white shadow-morbida">
        <h1 className="font-titoli text-xl font-bold">Partecipa a un quiz</h1>
        <p className="mt-1 text-sm opacity-85">Inserisci il codice che vedi in classe.</p>

        <form className="mt-5 flex flex-col gap-3" onSubmit={partecipa}>
          <input
            className="w-full rounded-xl border-2 border-white/30 bg-white/15 px-4 py-3 text-center font-titoli text-2xl font-bold uppercase tracking-[0.3em] text-white placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-white/60 outline-none focus:border-white"
            value={codice}
            onChange={(e) => setCodice(normalizzaCodice(e.target.value))}
            placeholder="codice"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            aria-label="Codice del quiz"
          />
          <button
            type="submit"
            disabled={!puoEntrare}
            className="rounded-xl bg-white px-4 py-3 font-titoli text-base font-bold text-primario-scuro transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {verifica ? "Verifico…" : "Entra"}
          </button>
          {errore && <p className="text-sm font-medium text-white">{errore}</p>}
        </form>
      </section>

      <button
        type="button"
        className="mt-6 self-center text-sm font-medium text-primario"
        onClick={() => navigate("/studente/statistiche")}
      >
        Le mie statistiche →
      </button>
    </div>
  );
}
