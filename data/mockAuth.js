// Autenticazione fittizia per lo sviluppo interno, PRIMA della sperimentazione
// con i ragazzi. Nessuno studente deve usare la piattaforma con questo modulo
// attivo: va sostituito da authProvider.js (Firebase Auth + Google, dominio
// istituzionale) come task esplicito della Fase 2, non lasciato "per dopo".
//
// Tutto il resto del codice chiama getUtenteCorrente() — quando si passa al
// login vero, si cambia questo file, non i punti da cui viene chiamato.

export function getUtenteCorrente(ruolo = "docente") {
  if (ruolo === "studente") {
    return {
      id: "mock-studente-1",
      ruolo: "studente",
      nome: "Giulia",
      cognome: "Bianchi",
      nickname: "giuly_04",
      avatarEmoji: "🦊",
      classeId: "3A",
      livello: 4,
    };
  }

  return {
    id: "mock-docente-1",
    ruolo: "docente",
    nome: "Rossi",
    classeId: "3A",
  };
}
