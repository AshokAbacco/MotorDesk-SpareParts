export default function Select({ label, error, hint, options = [], placeholder, className = '', id, ...props }) {
  const selectId = id || props.name;
  return (
    <div className={className}>
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <select id={selectId} className={`field ${error ? 'border-red-400' : ''}`} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'object' ? o : { value: o, label: o };
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
