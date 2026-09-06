// QR + link con cui gli studenti aprono un quiz attivo. Usato dopo la
// pubblicazione in CreaQuiz e nella lista di DocenteHome.
//
// Il link punta a window.location.origin: davvero utile solo dopo l'hosting
// (su localhost un telefono non lo raggiunge).

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function AccessoQuiz({ quizId, dimensioneQr = 180 }) {
  const [copiato, setCopiato] = useState(false);
  const link = `${window.location.origin}/quiz/${quizId}`;

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
      <p className="text-sm font-medium">Gli studenti accedono da qui:</p>
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
