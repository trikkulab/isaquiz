// Funzioni pure per il colore-identità (materia) e il colore-stato
// (padronanza) — vedi DECISIONI_DESIGN.md, "Sistema colore". Nessun
// componente calcola un colore da solo: passa sempre da qui.

// Classi scritte per esteso (non costruite con un template literal): il
// motore Tailwind trova le classi da generare scansionando il sorgente come
// testo, quindi una stringa tipo `border-materia-${indice}` non verrebbe mai
// individuata e la classe risulterebbe assente dal CSS finale.
const CLASSI_BORDO_MATERIA = [
  "border-materia-1",
  "border-materia-2",
  "border-materia-3",
  "border-materia-4",
  "border-materia-5",
  "border-materia-6",
  "border-materia-7",
  "border-materia-8",
  "border-materia-9",
  "border-materia-10",
  "border-materia-11",
  "border-materia-12",
];

// Bordo sinistro per materia: colore-identità, un token fisso per nome via
// hash (non serve tracciare "quante materie ho già visto" — a bassa
// cardinalità le collisioni sono rare e comunque l'etichetta testuale della
// materia resta sempre visibile accanto). "-neutro" è solo per materia
// mancante, non per un ipotetico overflow della palette.
export function coloreMateria(nome) {
  if (!nome || !nome.trim()) return "border-materia-neutro";

  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  }
  return CLASSI_BORDO_MATERIA[hash % CLASSI_BORDO_MATERIA.length];
}

// Padronanza di un argomento (aggregata su più quiz): colore-stato a 3
// valori, mai calcolato sul punteggio di un singolo quiz. Soglie decise
// (2026-09): <60% bassa, 60-79% media, >=80% alta.
export function livelloPadronanza(corrette, totali) {
  if (!(totali > 0)) return null;
  const frazione = corrette / totali;
  if (frazione < 0.6) return "bassa";
  if (frazione < 0.8) return "media";
  return "alta";
}

// Segnale di trend a livello corso (vista docente, "Andamento studente" —
// vedi DECISIONI_DESIGN.md e data/risposteRepository.js calcolaTrendMateria).
// Tre valori più il silenzio (null, il default): nessun colore senza
// l'etichetta testuale accanto.
export const ETICHETTA_SEGNALE = {
  calo: "In calo",
  debolezza: "Debolezza persistente",
  miglioramento: "In miglioramento",
};

export const BADGE_SEGNALE = {
  calo: "bg-segnale-calo-sfondo text-segnale-calo",
  debolezza: "bg-segnale-debolezza-sfondo text-segnale-debolezza",
  miglioramento: "bg-segnale-miglioramento-sfondo text-segnale-miglioramento",
};
