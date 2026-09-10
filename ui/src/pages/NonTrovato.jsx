// Route "*" — pagina 404. Pubblica (non dietro RichiediAuth): un URL sbagliato
// deve dare una via d'uscita anche a chi non ha sessione. Il link a "/" passa
// da Indirizza, che poi manda alla destinazione giusta per il ruolo.

import { Link } from "react-router-dom";

import PiePagina from "../components/PiePagina.jsx";

export default function NonTrovato() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex max-w-[420px] flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-titoli text-4xl font-bold text-primario">404</p>
        <p className="font-titoli text-lg font-bold">Pagina non trovata</p>
        <p className="text-sm text-inchiostro/70">
          L'indirizzo non esiste o non è più valido.
        </p>
        <Link to="/" className="mt-1 text-sm font-medium text-primario">
          Torna alla home
        </Link>
      </div>
      <PiePagina />
    </div>
  );
}
