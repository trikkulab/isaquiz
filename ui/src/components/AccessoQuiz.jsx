// Come gli studenti entrano in un quiz attivo: codice breve, QR, o link.
// Usato dopo la pubblicazione in CreaQuiz e nella lista di DocenteHome.
//
// Il link/QR si costruiscono da origin + BASE_URL (in prod "/isaquiz/") + "#/"
// (HashRouter): davvero utili solo dopo l'hosting (su localhost un telefono non
// li raggiunge). Il codice invece funziona appena c'è l'hosting, digitandolo
// sulla home studente.

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { getCodiceQuiz } from "../../../data/codiciAccessoRepository.js";

export default function AccessoQuiz({ quizId, dimensioneQr = 180 }) {
  const [copiato, setCopiato] = useState(false);
  const [codice, setCodice] = useState(null);
  // import.meta.env.BASE_URL: "/" in locale, "/isaquiz/" su GitHub Pages.
  const radiceApp = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const link = `${radiceApp}#/quiz/${quizId}`;

  useEffect(() => {
    let attivo = true;
    getCodiceQuiz(quizId)
      .then((c) => attivo && setCodice(c))
      .catch((err) => console.error("getCodiceQuiz:", err));
    return () => {
      attivo = false;
    };
  }, [quizId]);

  async function copia() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      /* clipboard non disponibile: l'utente seleziona il testo a mano */
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-bordo bg-sfondo p-4">
      {codice && (
        <div className="text-center">
          <p className="text-xs font-medium text-[#1e1b2e]/55">
            Codice (su {`${window.location.host}${import.meta.env.BASE_URL}#/studente`})
          </p>
          <p className="font-titoli text-3xl font-bold tracking-[0.25em] text-primario-scuro">
            {codice}
          </p>
        </div>
      )}

      <p className="text-sm font-medium">…oppure con il QR:</p>
      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG value={link} size={dimensioneQr} />
      </div>

      <div className="flex w-full items-center gap-2">
        <input
          className="w-full rounded-lg border border-bordo bg-white px-3 py-2 text-xs outline-none focus:border-primario"
          value={link}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className="shrink-0 rounded-lg border border-bordo bg-white px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario"
          onClick={copia}
        >
          {copiato ? "Copiato" : "Copia"}
        </button>
      </div>
    </div>
  );
}
