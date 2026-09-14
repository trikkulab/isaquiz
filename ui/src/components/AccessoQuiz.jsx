// Come gli studenti entrano in un quiz attivo: codice breve, QR, o link.
// Usato dopo la pubblicazione in CreaQuiz e nella lista di DocenteHome.
//
// Il link/QR si costruiscono da origin + BASE_URL (oggi "/" — dominio custom
// alla radice, vedi vite.config.js) + "#/" (HashRouter): davvero utili solo
// dopo l'hosting (su localhost un telefono non li raggiunge). Il codice invece
// funziona appena c'è l'hosting, digitandolo sulla home studente.

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { getCodiceQuiz } from "../../../data/codiciAccessoRepository.js";

export default function AccessoQuiz({ quizId, dimensioneQr = 180 }) {
  const [copiato, setCopiato] = useState(false);
  const [codice, setCodice] = useState(null);
  const [ingrandito, setIngrandito] = useState(false);
  // import.meta.env.BASE_URL: "/" (dominio custom alla radice, vite.config.js).
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

  // Overlay "a tutto schermo" (CSS, non Fullscreen API: si chiude con un
  // click qualsiasi, coerente con "riclicco e torna normale" — la
  // Fullscreen API richiederebbe invece Esc/un'altra chiamata, comportamento
  // diverso da quello chiesto). Stesso schema di ModaleCorrezione.jsx
  // (Escape, blocco scroll del body) ma senza un pannello interno da
  // proteggere da stopPropagation: qui TUTTO l'overlay è il bottone di
  // chiusura, com'è per il proiettore in classe.
  useEffect(() => {
    if (!ingrandito) return;
    const onTasto = (e) => {
      if (e.key === "Escape") setIngrandito(false);
    };
    window.addEventListener("keydown", onTasto);
    const overflowPrec = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onTasto);
      document.body.style.overflow = overflowPrec;
    };
  }, [ingrandito]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-bordo bg-sfondo p-4">
      {codice && (
        <div className="text-center">
          <p className="text-xs font-medium text-inchiostro/55">
            Codice (su {`${window.location.host}${import.meta.env.BASE_URL}#/studente`})
          </p>
          <p className="font-titoli text-3xl font-bold tracking-[0.25em] text-primario-scuro">
            {codice}
          </p>
        </div>
      )}

      <p className="text-sm font-medium">…oppure con il QR:</p>
      {/* Sfondo del QR sempre bianco: serve alla scansione, non segue il tema. */}
      <button
        type="button"
        className="rounded-lg bg-white p-3 transition-transform active:scale-95"
        onClick={() => setIngrandito(true)}
        title="Ingrandisci per mostrarlo alla classe"
      >
        <QRCodeSVG value={link} size={dimensioneQr} />
      </button>

      {ingrandito && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-8 bg-white p-8"
          onClick={() => setIngrandito(false)}
          role="dialog"
          aria-modal="true"
          aria-label="QR e codice del quiz, ingranditi"
        >
          {codice && (
            <p className="text-center font-titoli text-[12vmin] font-bold leading-none tracking-[0.2em] text-primario-scuro">
              {codice}
            </p>
          )}
          <QRCodeSVG value={link} size={dimensioneQr} style={{ width: "min(70vw, 60vh)", height: "min(70vw, 60vh)" }} />
          <p className="text-sm text-inchiostro/40">Tocca ovunque per chiudere</p>
        </div>
      )}

      <div className="flex w-full items-center gap-2">
        <input
          className="w-full rounded-lg border border-bordo bg-superficie px-3 py-2 text-xs outline-none focus:border-primario"
          value={link}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className="shrink-0 rounded-lg border border-bordo bg-superficie px-3 py-1.5 text-sm font-medium text-primario transition-colors hover:border-primario"
          onClick={copia}
        >
          {copiato ? "Copiato" : "Copia"}
        </button>
      </div>
    </div>
  );
}
