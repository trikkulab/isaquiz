// Piccolo toggle per il verso di ordinamento, accanto a un <select> di
// ordinamento. Mostra ↓ (decrescente: recenti, Z→A, valori alti prima) o ↑
// (crescente) e al clic inverte. Usato in DocenteHome e CreaQuiz.

export default function BottoneVerso({ discendente, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-lg border border-bordo bg-superficie px-2.5 py-1.5 text-xs font-semibold leading-none text-primario transition-colors hover:border-primario"
      title={
        discendente
          ? "Ordine decrescente — clicca per invertire"
          : "Ordine crescente — clicca per invertire"
      }
      aria-label={`Ordinamento ${discendente ? "decrescente" : "crescente"}, clicca per invertire`}
      aria-pressed={discendente}
    >
      {discendente ? "↓" : "↑"}
    </button>
  );
}
