// Scritte come handler Node.js standard, non con trigger proprietari dove
// evitabile: portabile su un altro provider serverless in futuro senza
// riscrivere la logica, solo il "collante" di deploy.

export { calcolaPunteggio } from "./calcolaPunteggio.js";
export { generaQuesiti } from "./aiProvider.js";
