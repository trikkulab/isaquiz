// Home dello studente (route /studente, area "Studente" del guscio): da qui si
// partecipa a un quiz col codice. Identità utente e "Esci" sono nell'header
// condiviso (AppLayout); "Le mie statistiche" è una pagina dell'area.
//
// Stile "studente": più vivo e accogliente delle schermate docente (vedi
// CLAUDE.md, "Schermate studente"), ma leggero e velocissimo.

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import {
  getQuizIdDaCodice,
  normalizzaCodice,
} from "../../../data/codiciAccessoRepository.js";
import IdentitaStudente from "../components/IdentitaStudente.jsx";

export default function StudenteHome() {
  const studente = useUtenteCorrente();
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
    <div className="mx-auto flex max-w-[480px] flex-col px-4 py-8">
      <div className="mb-6">
        <IdentitaStudente studente={studente} variante="chiara" />
      </div>

      <section className="rounded-[22px] bg-gradient-to-br from-primario to-primario-scuro p-6 text-su-primario shadow-morbida">
        <h1 className="font-titoli text-xl font-bold">Partecipa a un quiz</h1>
        <p className="mt-1 text-sm opacity-85">Inserisci il codice che vedi in classe.</p>

        <form className="mt-5 flex flex-col gap-3" onSubmit={partecipa}>
          <input
            className="w-full rounded-xl border-2 border-su-primario/30 bg-su-primario/15 px-4 py-3 text-center font-titoli text-2xl font-bold uppercase tracking-[0.3em] text-su-primario placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-su-primario/60 outline-none focus:border-su-primario"
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
            className="rounded-xl bg-su-primario px-4 py-3 font-titoli text-base font-bold text-primario-scuro transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {verifica ? "Verifico…" : "Entra"}
          </button>
          {errore && <p className="text-sm font-medium text-su-primario">{errore}</p>}
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
