// Statistiche personali dello studente (route /studente/statistiche): come sto
// andando nel tempo, aggregato per ARGOMENTO (non per singolo quiz — vedi
// DECISIONI_DESIGN.md, "Statistiche studente"). Filtro per materia
// (FiltroMaterie: "Anno" = tutte, oppure una specifica).
//
// Layout ADATTIVO, non solo responsive (DECISIONI_DESIGN.md, "Layout adattivo"):
// sotto la soglia (useBreakpoint) AccordionArgomenti + ModaleCorrezione; sopra,
// PannelloArgomenti master-detail con la correzione inline. Il contenuto
// (QuizRisultati, via CorrezioneQuiz) è identico nei due casi — cambia solo il
// contenitore che lo monta.
//
// La pagina fa UNA lettura aggregata (getStatistichePerArgomento, forma
// annidata) e filtra per materia in memoria: cambiare tab non rilegge nulla e
// il drill-down è immediato.

import { useEffect, useMemo, useState } from "react";

import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getStatistichePerArgomento } from "../../../data/risposteRepository.js";
import FiltroMaterie from "../components/FiltroMaterie.jsx";
import AccordionArgomenti from "../components/AccordionArgomenti.jsx";
import PannelloArgomenti from "../components/PannelloArgomenti.jsx";
import IdentitaStudente from "../components/IdentitaStudente.jsx";

export default function StatisticheStudente() {
  const studente = useUtenteCorrente();
  const { isDesktop } = useBreakpoint();

  const [tutti, setTutti] = useState([]);
  const [stato, setStato] = useState("caricamento"); // caricamento | errore | pronto
  const [materia, setMateria] = useState(null); // null = "Anno" (tutte)

  useEffect(() => {
    let vivo = true;
    setStato("caricamento");
    (async () => {
      try {
        const dati = await getStatistichePerArgomento(studente.id);
        if (!vivo) return;
        setTutti(dati);
        setStato("pronto");
      } catch (err) {
        console.error(err);
        if (vivo) setStato("errore");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [studente.id]);

  const materie = useMemo(
    () =>
      [...new Set(tutti.map((s) => s.materia).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "it"),
      ),
    [tutti],
  );

  const argomenti = useMemo(
    () => (materia == null ? tutti : tutti.filter((s) => s.materia === materia)),
    [tutti, materia],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-5">
        <IdentitaStudente studente={studente} variante="chiara" />
      </div>

      <h1 className="text-xl font-semibold">Le mie statistiche</h1>
      <p className="mt-0.5 text-sm text-inchiostro/55">
        Come stai andando, argomento per argomento. Apri un argomento per vedere i
        quiz che lo toccano.
      </p>

      {stato === "caricamento" && (
        <p className="mt-8 text-sm text-inchiostro/60">Caricamento…</p>
      )}

      {stato === "errore" && (
        <div className="mt-6 rounded-lg border border-errore bg-errore-sfondo px-3 py-2 text-sm text-errore">
          Non è stato possibile caricare le statistiche. Ricarica la pagina.
        </div>
      )}

      {stato === "pronto" && tutti.length === 0 && (
        <div className="mt-6 rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
          Non hai ancora svolto nessun quiz. Le statistiche compaiono qui appena
          rispondi al primo.
        </div>
      )}

      {stato === "pronto" && tutti.length > 0 && (
        <>
          <div className="mt-5">
            <FiltroMaterie
              materie={materie}
              selezione={materia}
              onSelezione={setMateria}
            />
          </div>

          <div className="mt-4">
            {argomenti.length === 0 ? (
              <div className="rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
                Nessun quiz per questa materia.
              </div>
            ) : isDesktop ? (
              <PannelloArgomenti
                key={materia ?? "anno"}
                argomenti={argomenti}
                studenteId={studente.id}
              />
            ) : (
              <AccordionArgomenti
                key={materia ?? "anno"}
                argomenti={argomenti}
                studenteId={studente.id}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
