// Testi editoriali statici del progetto: copy che cambia raramente e non
// dipende da stato applicativo o runtime (punteggio, utente, risultati — quei
// dati restano nei componenti o nei repository, non qui).
// Per parametri di comportamento del quiz vedi config/impostazioniQuiz.js
//
// Convenzione: export nominati e piatti, uno per costante. Nessuna
// struttura/schema comune imposto in anticipo, nessuna categoria annidata —
// ogni costante ha la forma che le serve (stringa, oggetto, array), decisa
// caso per caso quando viene aggiunta davvero. Esempi di costanti future
// dello stesso tipo, non ancora aggiunte: linkInformativaPrivacy (Fase 5),
// avvisoGeneratoreIA (Fase 3).

export const creditoTecnico = {
  nomeApp: "isaquiz",
  nomeSviluppatore: "Ivan Piasini",
  tecnologie: ["React", "Firebase", "Claude Code"],
  link: null, // opzionale, per ora vuoto
};
