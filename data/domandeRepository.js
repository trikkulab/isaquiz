// Unico punto di accesso alla collezione "domande" (banca dati del docente
// e, se domanda.condivisa == true, dell'istituto).

// import { db } from "./firebaseClient.js";

export async function getDomandeDocente(docenteId) {
  // TODO Fase 1: domande create/possedute dal docente.
}

export async function getDomandeCondivise({ materia, argomento, difficolta } = {}) {
  // TODO Fase 4: domande con condivisa == true, filtrabili.
}

export async function creaDomanda(domanda) {
  // TODO Fase 1 (creazione manuale) — usata anche in Fase 3 per salvare le
  // domande generate dall'IA dopo la revisione del docente.
}

export async function condividiDomanda(domandaId, condivisa) {
  // TODO Fase 4
}
