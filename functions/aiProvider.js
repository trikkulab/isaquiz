// Unico punto di chiamata al provider IA esterno. La chiave API vive solo qui,
// come secret della function (Secret Manager, mai nel client, mai in /ui, mai
// in un file versionato) — vedi docs/deploy.md per come impostarla.
//
// Percorso INTERNO di generazione (Fase 3) — vedi DECISIONI_DESIGN.md,
// "Generazione domande: interna vs esterna": riservato all'autore del
// progetto per dogfooding, MAI aperto a tutti i docenti (una sola chiave
// condivisa esaurirebbe il free tier con pochi utenti). Due guardie, in
// ordine, verificate qui e non solo lato client:
//  1. utenti/{uid}.generazioneIA === true (flag scritto solo da console/seed)
//  2. contatore giornaliero richiesteIAOggi, per non bruciare la quota per
//     errore (loop, doppio click, test ripetuti) anche per l'unico utente
//     abilitato.
//
// Vincolo GDPR da rispettare nell'interfaccia a monte (CreaQuiz.jsx /
// GeneraQuesitiIA.jsx): il testo inviato qui deve essere appunti/argomenti
// del docente, mai dati di studenti specifici — vedi analisi-gdpr.md, sez. 5.
//
// Provider: Google AI Studio (Gemini), scelto per semplicità di setup nel
// dogfooding (una sola API key, free tier generoso) — non garantisce
// esplicitamente infrastruttura UE, a differenza di Vertex AI. Accettabile
// ora perché quest'unico percorso non tratta mai dati di studenti per
// costruzione (vedi sopra); da rivalutare (migrazione a Vertex AI, stesso
// contratto verso RevisioneQuesiti) se il percorso interno dovesse aprirsi
// oltre l'autore. Vedi DECISIONI_DESIGN.md, "Generazione domande: interna vs
// esterna" e "Non ancora deciso".

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";

import { db, REGIONE } from "./_admin.js";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Modello scelto per costo/velocità: sufficiente per quesiti a scelta
// multipla, non serve la qualità (né il costo) di un modello "pro".
// `gemini-2.5-flash` non è più disponibile per nuove chiavi API (l'errore
// 404 del provider lo segnala esplicitamente) — verificare di tanto in
// tanto che il nome del modello sia ancora quello corrente.
const MODELLO = "gemini-3.6-flash";

// A mano, alzabile se il pilot lo richiede — serve solo a evitare che un
// errore (loop, doppio click) esaurisca la quota giornaliera del free tier.
const LIMITE_GIORNALIERO = 20;

const NUM_MIN = 1;
const NUM_MAX = 20;

// Sincronizzato a mano con ui/src/components/ImportaQuesitiIA.jsx
// (generaPrompt): stesso schema di output, stesso contratto verso
// RevisioneQuesiti. functions/ non può importare da ui/ (in deploy viene
// caricato solo functions/).
function generaPrompt(testo, numero) {
  return `Genera ${numero} quesiti a risposta multipla in italiano, per una verifica scolastica, sul seguente argomento.

Argomento/appunti:
"""
${testo}
"""

Regole per ogni quesito:
- "testo": il testo della domanda.
- "opzioni": un array di almeno 2 e al massimo 6 stringhe (le alternative di risposta).
- "indiceCorretto": l'indice (a partire da 0) dell'opzione corretta nell'array "opzioni".
- "spiegazione": sempre presente, spiega brevemente perché la risposta è corretta.
- "argomento": opzionale, un sotto-argomento specifico del quesito.
Non inventare fatti: se non sei certo di un dettaglio, scegli un altro quesito.

Rispondi SOLO con un oggetto JSON in questo formato esatto, senza testo prima o dopo e senza blocchi di codice markdown:
{"quesiti":[{"testo":"...","opzioni":["...","...","..."],"indiceCorretto":0,"spiegazione":"...","argomento":"..."}]}`;
}

// Data odierna in Europe/Rome, come chiave del contatore giornaliero — non
// UTC, per non spostare il reset a un orario scomodo per un utente in Italia.
function oggiRoma() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); // "YYYY-MM-DD"
}

// Estrae il JSON dalla risposta del modello, tollerante a eventuali blocchi
// markdown (```json ... ```) nonostante la richiesta esplicita di non usarli.
function estraiJson(testo) {
  const ripulito = testo.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(ripulito);
}

async function chiamaGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELLO}:generateContent?key=${apiKey}`;
  const risposta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!risposta.ok) {
    const dettaglio = await risposta.text().catch(() => "");
    logger.error("Errore dal provider Gemini", { status: risposta.status, dettaglio });
    throw new HttpsError("internal", "Il provider IA ha risposto con un errore.");
  }

  const corpo = await risposta.json();
  const testo = corpo?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof testo !== "string" || !testo.trim()) {
    logger.error("Risposta del provider senza testo utilizzabile", { corpo });
    throw new HttpsError("internal", "Il provider IA non ha restituito un contenuto valido.");
  }
  return testo;
}

export const generaQuesiti = onCall(
  { region: REGIONE, secrets: [GEMINI_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Devi essere autenticato.");

    const testo = typeof request.data?.testo === "string" ? request.data.testo.trim() : "";
    if (!testo) throw new HttpsError("invalid-argument", "Argomento/appunti mancante.");

    const numero = Number.isInteger(request.data?.numero) ? request.data.numero : NaN;
    if (numero < NUM_MIN || numero > NUM_MAX) {
      throw new HttpsError("invalid-argument", `«numero» deve essere tra ${NUM_MIN} e ${NUM_MAX}.`);
    }

    const utenteRef = db.doc(`utenti/${uid}`);
    const utenteSnap = await utenteRef.get();
    const utente = utenteSnap.data();
    if (!utente?.generazioneIA) {
      throw new HttpsError("permission-denied", "Generazione IA interna non abilitata per questo utente.");
    }

    const oggi = oggiRoma();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(utenteRef);
      const dati = snap.data() ?? {};
      const contatoreAttuale = dati.richiesteIADataOggi === oggi ? dati.richiesteIAOggi ?? 0 : 0;
      if (contatoreAttuale >= LIMITE_GIORNALIERO) {
        throw new HttpsError(
          "resource-exhausted",
          `Limite giornaliero di generazioni IA raggiunto (${LIMITE_GIORNALIERO}/giorno).`
        );
      }
      tx.set(
        utenteRef,
        { richiesteIAOggi: contatoreAttuale + 1, richiesteIADataOggi: oggi },
        { merge: true }
      );
    });

    const prompt = generaPrompt(testo, numero);
    const testoRisposta = await chiamaGemini(prompt, GEMINI_API_KEY.value());

    let payload;
    try {
      payload = estraiJson(testoRisposta);
    } catch {
      logger.error("Risposta del provider non è JSON valido", { testoRisposta });
      throw new HttpsError("internal", "Il provider IA ha restituito una risposta non interpretabile.");
    }
    if (!payload || !Array.isArray(payload.quesiti)) {
      logger.error("Risposta del provider in forma inattesa", { payload });
      throw new HttpsError("internal", "Il provider IA ha restituito una risposta in un formato inatteso.");
    }

    logger.info(`Generazione IA interna per ${uid}: ${payload.quesiti.length} quesiti`);
    return { quesiti: payload.quesiti };
  }
);
