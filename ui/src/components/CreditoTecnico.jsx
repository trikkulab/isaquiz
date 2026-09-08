// Credito tecnico discreto. Va montato esplicitamente da chi fa da
// "contenitore pagina intera" per una schermata — MAI dentro un componente
// "contenuto puro" come QuizRisultati.jsx, che non deve assumere il proprio
// contenitore (vedi CLAUDE.md, "Regole architetturali fisse").
//
// Compone la stringa dai valori di config/testi.js (copy editoriale) + dalla
// versione in package.json (metadato di build, non testo scritto a mano: va
// tenuto in un'unica fonte di verità, non duplicato qui a mano).

import { creditoTecnico } from "../config/testi.js";
import { version } from "../../package.json";

function elencaConE(elementi) {
  if (elementi.length <= 1) return elementi.join("");
  return `${elementi.slice(0, -1).join(", ")} e ${elementi[elementi.length - 1]}`;
}

export default function CreditoTecnico() {
  const { nomeApp, nomeSviluppatore, tecnologie, link } = creditoTecnico;
  const testo = `${nomeApp} v${version} — Realizzato da ${nomeSviluppatore} con ${elencaConE(tecnologie)}`;

  return (
    <p className="mt-8 pb-6 text-center text-xs text-inchiostro/40">
      {link ? (
        <a href={link} className="hover:underline">
          {testo}
        </a>
      ) : (
        testo
      )}
    </p>
  );
}
