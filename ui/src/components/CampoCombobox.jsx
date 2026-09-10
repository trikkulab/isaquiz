// Campo di testo con suggerimenti: `<input>` + `<datalist>` nativi. Editabile
// (si può scegliere un suggerimento o digitarne uno nuovo), accessibile, ok su
// mobile, zero dipendenze — coerente con "niente libreria di componenti finché
// non serve" (vedi CLAUDE.md, "Styling").
//
// Usato per la materia/classe nel form di creazione corso: i suggerimenti sono
// i valori già in uso in TUTTI i corsi dell'istituto, ma il testo resta libero
// (vedi DECISIONI_DESIGN.md, "Combobox materia (form corso)").

const CAMPO =
  "w-full rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm outline-none focus:border-primario";

export default function CampoCombobox({
  id,
  value,
  onChange,
  opzioni = [],
  placeholder,
  ...rest
}) {
  const listId = `${id}-opzioni`;
  return (
    <>
      <input
        id={id}
        list={listId}
        className={CAMPO}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        {...rest}
      />
      <datalist id={listId}>
        {opzioni.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
