// Si attiva alla scrittura di una risposta grezza in Firestore. Confronta con
// la risposta corretta (non leggibile dal client) e scrive il campo "corretta"
// sul documento risposta. Il client non calcola né scrive mai questo campo:
// previene la manipolazione del punteggio da parte dello studente.
//
// TODO Fase 1.

export async function calcolaPunteggio(event) {
  // TODO: leggere la risposta scritta, il quesito corrispondente,
  // confrontare, scrivere risposta.corretta.
}
