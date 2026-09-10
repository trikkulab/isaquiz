// Footer delle pagine "contenitore" (pagina intera): il nome dell'istituto —
// che vive su Firestore, non nel codice — sopra il credito tecnico.
//
// Va montato esplicitamente da chi fa da contenitore, MAI dentro un componente
// "contenuto puro" (es. QuizRisultati). Non va nell'header/footer di
// QuizStudente: quella schermata resta minimale per vincolo di
// semplicità/immediatezza (vedi DECISIONI_DESIGN.md, "Multi-istituto").
//
// nomeIstituto è contesto amministrativo/legale: se la lettura fallisce o
// CONFIG non è popolato, semplicemente non si mostra (niente dato finto).

import { useEffect, useState } from "react";

import CreditoTecnico from "./CreditoTecnico.jsx";
import { getNomeIstituto } from "../../../data/configRepository.js";

export default function PiePagina() {
  const [nomeIstituto, setNomeIstituto] = useState(null);

  useEffect(() => {
    let attivo = true;
    getNomeIstituto()
      .then((nome) => attivo && setNomeIstituto(nome))
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, []);

  return (
    <footer className="mt-8 flex flex-col items-center gap-0.5 px-4 pb-5 text-center">
      {nomeIstituto && (
        <p className="text-xs font-medium text-inchiostro/45">{nomeIstituto}</p>
      )}
      <CreditoTecnico />
    </footer>
  );
}
