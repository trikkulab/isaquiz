// Entry point delle Cloud Function (Firebase Functions v2, ESM). Ogni function
// è definita e configurata nel proprio file; qui si limitano a essere
// ri-esportate — `firebase deploy --only functions` scopre gli export di
// questo modulo.
//
// L'Admin SDK è inizializzato una volta sola in ./_admin.js.

export { calcolaPunteggio } from "./calcolaPunteggio.js";
export { generaCodiceAccesso } from "./generaCodiceAccesso.js";
export { generaQuesiti } from "./aiProvider.js";
