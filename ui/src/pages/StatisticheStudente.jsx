// Statistiche personali dello studente (route /studente/statistiche): come sto
// andando nel tempo, aggregato per ARGOMENTO (non per singolo quiz — vedi
// DECISIONI_DESIGN.md, "Statistiche studente"). Filtro per CORSO, non per
// materia (FiltroMaterie: "Anno" = tutti i corsi dell'anno selezionato,
// oppure un corso specifico) — due corsi diversi con la stessa materia
// restano due tab distinte.
//
// Filtro ANNO SCOLASTICO (SelettoreAnno, vedi DECISIONI_DESIGN.md, "Cambio
// anno scolastico"): di default si vede solo l'anno corrente, coerente col
// resto del progetto ("si lavora sull'anno corrente, lo storico resta
// raggiungibile ma non mescolato"). Un gruppo di getStatistichePerArgomento
// appartiene sempre a un solo anno (un corso è di un solo anno per
// costruzione), quindi il filtro anno è solo una questione di QUALI righe
// considerare prima di derivare tab-corso e argomenti — nessuna fusione tra
// anni diversi in nessun caso.
//
// Layout ADATTIVO, non solo responsive (DECISIONI_DESIGN.md, "Layout adattivo"):
// sotto la soglia (useBreakpoint) AccordionArgomenti + ModaleCorrezione; sopra,
// PannelloArgomenti master-detail con la correzione inline. Il contenuto
// (QuizRisultati, via CorrezioneQuiz) è identico nei due casi — cambia solo il
// contenitore che lo monta.
//
// La pagina fa UNA lettura aggregata (getStatistichePerArgomento, forma
// annidata) + una di config (anno corrente), poi filtra tutto in memoria:
// cambiare anno o tab non rilegge nulla e il drill-down è immediato.

import { useEffect, useMemo, useState } from "react";

import { useUtenteCorrente } from "../auth/AuthContext.jsx";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { getStatistichePerArgomento } from "../../../data/risposteRepository.js";
import { getConfig } from "../../../data/configRepository.js";
import FiltroMaterie from "../components/FiltroMaterie.jsx";
import SelettoreAnno from "../components/SelettoreAnno.jsx";
import AccordionArgomenti from "../components/AccordionArgomenti.jsx";
import PannelloArgomenti from "../components/PannelloArgomenti.jsx";
import IdentitaStudente from "../components/IdentitaStudente.jsx";

export default function StatisticheStudente() {
  const studente = useUtenteCorrente();
  const { isDesktop } = useBreakpoint();

  const [tutti, setTutti] = useState([]);
  const [annoCorrente, setAnnoCorrente] = useState(null);
  const [stato, setStato] = useState("caricamento"); // caricamento | errore | pronto
  const [corsoSel, setCorsoSel] = useState(null); // null = "Anno" (tutti i corsi dell'anno)
  const [mostraPrecedenti, setMostraPrecedenti] = useState(false);
  const [annoSel, setAnnoSel] = useState(null); // rilevante solo se mostraPrecedenti

  useEffect(() => {
    let vivo = true;
    setStato("caricamento");
    (async () => {
      try {
        const [dati, config] = await Promise.all([
          getStatistichePerArgomento(studente.id),
          getConfig(),
        ]);
        if (!vivo) return;
        setTutti(dati);
        setAnnoCorrente(config?.annoScolasticoCorrente ?? null);
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

  // Anni per cui esistono dati, uniti all'anno corrente (anche se lo
  // studente non ha ancora risposto a nulla quest'anno — inizio anno), più
  // recenti prima.
  const anni = useMemo(() => {
    const set = new Set(tutti.map((s) => s.anno).filter(Boolean));
    if (annoCorrente) set.add(annoCorrente);
    return [...set].sort((a, b) => b.localeCompare(a, "it"));
  }, [tutti, annoCorrente]);

  // Anno effettivo su cui filtrare: sempre quello corrente finché non si
  // accende "Mostra anni precedenti". Se l'anno corrente non è configurato
  // (difensivo, non dovrebbe succedere), niente filtro anno.
  const annoEffettivo = mostraPrecedenti ? (annoSel ?? annoCorrente) : annoCorrente;

  const righeAnno = useMemo(
    () => (annoEffettivo ? tutti.filter((s) => s.anno === annoEffettivo) : tutti),
    [tutti, annoEffettivo],
  );

  function alternaPrecedenti(v) {
    setMostraPrecedenti(v);
    setAnnoSel(null);
    setCorsoSel(null);
  }

  function selezionaAnno(a) {
    setAnnoSel(a);
    setCorsoSel(null);
  }

  // Una tab per CORSO (non per materia): due corsi diversi con la stessa
  // materia restano tab distinte — vedi DECISIONI_DESIGN.md, "Statistiche
  // studente" e FiltroMaterie.jsx. Derivata dalle sole righe dell'anno
  // selezionato: i corsi di altri anni non compaiono come tab.
  const corsi = useMemo(() => {
    const perCorso = new Map();
    for (const s of righeAnno) {
      if (s.corsoId && !perCorso.has(s.corsoId)) {
        perCorso.set(s.corsoId, { corsoId: s.corsoId, materia: s.materia, docente: s.docente });
      }
    }
    return [...perCorso.values()].sort(
      (a, b) =>
        (a.materia ?? "").localeCompare(b.materia ?? "", "it") ||
        (a.docente ?? "").localeCompare(b.docente ?? "", "it"),
    );
  }, [righeAnno]);

  const argomenti = useMemo(
    () => (corsoSel == null ? righeAnno : righeAnno.filter((s) => s.corsoId === corsoSel)),
    [righeAnno, corsoSel],
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
            <SelettoreAnno
              anni={anni}
              annoCorrente={annoCorrente}
              mostraPrecedenti={mostraPrecedenti}
              onMostraPrecedenti={alternaPrecedenti}
              annoSelezionato={annoSel}
              onSelezionaAnno={selezionaAnno}
            />
          </div>

          <div className="mt-2">
            <FiltroMaterie
              corsi={corsi}
              selezione={corsoSel}
              onSelezione={setCorsoSel}
            />
          </div>

          <div className="mt-4">
            {argomenti.length === 0 ? (
              <div className="rounded-xl border border-bordo bg-superficie p-6 text-sm text-inchiostro/60">
                {corsoSel == null ? "Nessun quiz per l'anno selezionato." : "Nessun quiz per questo corso."}
              </div>
            ) : isDesktop ? (
              <PannelloArgomenti
                key={`${annoEffettivo ?? "tutti"}::${corsoSel ?? "anno"}`}
                argomenti={argomenti}
                studenteId={studente.id}
              />
            ) : (
              <AccordionArgomenti
                key={`${annoEffettivo ?? "tutti"}::${corsoSel ?? "anno"}`}
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
