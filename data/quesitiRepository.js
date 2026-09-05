// Unico punto di accesso alla collezione "quesiti" (banca dati del docente
// e, se quesito.condivisa == true, dell'istituto).

// import { db } from "./firebaseClient.js";

export async function getQuesitiDocente(docenteId) {
  // TODO Fase 1: quesiti creati/posseduti dal docente.
}

export async function getQuesitiCondivisi({ materia, argomento, difficolta } = {}) {
  // TODO Fase 4: quesiti con condivisa == true, filtrabili.
}

export async function creaQuesito(quesito) {
  // TODO Fase 1 (creazione manuale) — usata anche in Fase 3 per salvare i
  // quesiti generati dall'IA dopo la revisione del docente.
}

export async function condividiQuesito(quesitoId, condivisa) {
  // TODO Fase 4
}
