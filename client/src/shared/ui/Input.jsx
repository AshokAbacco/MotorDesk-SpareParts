import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, hint, icon: Icon, className = '', id, ...props }, ref) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input ref={ref} id={inputId} className={`field ${Icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`} {...props} />
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export default Input;
