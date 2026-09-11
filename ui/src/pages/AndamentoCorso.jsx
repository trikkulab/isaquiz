// Vista docente: andamento degli studenti di UN corso nel tempo (route
// /docente/corsi/:corsoId/andamento) — mai per materia in astratto: un
// corso è materia+classe+anno e resta sempre distinto da un altro corso
// della stessa materia in una classe diversa (vedi CLAUDE.md, "CORSO, non
// CLASSE, è il contenitore dei quiz"). Vedi DECISIONI_DESIGN.md, "Andamento
// studente".
//
// Layout ADATTIVO come StatisticheStudente (DECISIONI_DESIGN.md, "Layout
// adattivo"): sotto la soglia AccordionAndamento, sopra PannelloAndamento
// master-detail. Una lettura aggregata (getAndamentoCorso): il drill-down
// per studente non rilegge nulla.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getCorso } from "../../../data/corsiRepository.js";
import { getAndamentoCorso } from "../../../data/risposteRepository.js";
import AccordionAndamento from "../components/AccordionAndamento.jsx";
import PannelloAndamento from "../components/PannelloAndamento.jsx";

export default function AndamentoCorso() {
  const { corsoId } = useParams();
  const docente = useUtenteCorrente();
  const { isDesktop } = useBreakpoint();

  const [corso, setCorso] = useState(null);
  const [studenti, setStudenti] = useState([]);
  const [stato, setStato] = useState("caricamento"); // caricamento | errore | pronto

  useEffect(() => {
    let vivo = true;
    setStato("caricamento");
    (async () => {
      try {
        const [c, dati] = await Promise.all([
          getCorso(corsoId),
          getAndamentoCorso(corsoId, docente.id),
        ]);
        if (!vivo) return;
        setCorso(c);
        setStudenti(dati);
        setStato("pronto");
      } catch (err) {
        console.error(err);
        if (vivo) setStato("errore");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [corsoId, docente.id]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/docente/corsi" className="text-xs font-medium text-primario">
        ← I miei corsi
      </Link>
      <h1 className="mt-2 text-xl font-semibold">
        Andamento{corso ? ` — ${corso.materia} · ${corso.classeId}` : ""}
      </h1>
      <p className="mt-0.5 text-sm text-inchiostro/55">
        Il segnale di trend richiede almeno 4 quiz per studente: sotto soglia,
        o senza un andamento chiaro, non compare nulla.
      </p>

      {stato === "caricamento" && (
        <p className="mt-8 text-sm text-inchiostro/60">Caricamento…</p>
      )}

      {stato === "errore" && (
        <div className="mt-6 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          Non è stato possibile caricare l'andamento. Ricarica la pagina.
        </div>
      )}

      {stato === "pronto" && studenti.length === 0 && (
        <div className="mt-6 rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
          Nessuno studente ha ancora risposto a un quiz di questo corso.
        </div>
      )}

      {stato === "pronto" && studenti.length > 0 && (
        <div className="mt-5">
          {isDesktop ? (
            <PannelloAndamento studenti={studenti} />
          ) : (
            <AccordionAndamento studenti={studenti} />
          )}
        </div>
      )}
    </div>
  );
}
