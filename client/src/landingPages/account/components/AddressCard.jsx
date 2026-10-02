// client/src/landingPages/account/components/AddressCard.jsx
import { Briefcase, CheckCircle2, Home, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { addressLines } from '../../checkout/components/AddressForm.jsx';

const ICON = { Home, Work: Briefcase };

/**
 * Shows one saved address.
 * - In My Account: pass onEdit / onDelete / onMakeDefault
 * - At checkout:   pass selectable + selected + onSelect (renders as a radio card)
 */
export default function AddressCard({ address: a, onEdit, onDelete, onMakeDefault, selectable, selected, onSelect }) {
  const Icon = ICON[a.label] ?? MapPin;
  const Wrapper = selectable ? 'button' : 'div';

  return (
    <Wrapper
      type={selectable ? 'button' : undefined}
      onClick={selectable ? () => onSelect(a) : undefined}
      className={`card flex h-full w-full flex-col p-4 text-left transition ${selectable ? 'hover:border-brand-300' : ''} ${selected ? 'border-brand-500 ring-2 ring-brand-500' : ''}`}
    >
      <div className="mb-2 flex items-center gap-2">
        {selectable && (
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-brand-600' : 'border-slate-300'}`}>
            {selected && <span className="h-2 w-2 rounded-full bg-brand-600" />}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <Icon className="h-3.5 w-3.5" /> {a.label}
        </span>
        {a.isDefault && <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Default</span>}
      </div>

      <p className="font-semibold text-slate-800">{a.name}</p>
      <div className="mt-0.5 flex-1 text-sm text-slate-600">
        {addressLines(a).map((l) => <p key={l}>{l}</p>)}
      </div>
      <p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400" /> {a.phone}</p>

      {(onEdit || onDelete || onMakeDefault) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-sm">
          {onEdit && <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(a); }} className="flex items-center gap-1 font-medium text-brand-600 hover:underline"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
          {onDelete && <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(a); }} className="flex items-center gap-1 font-medium text-red-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
          {onMakeDefault && !a.isDefault && <button type="button" onClick={(e) => { e.stopPropagation(); onMakeDefault(a); }} className="ml-auto font-medium text-slate-600 hover:text-brand-600">Set as default</button>}
        </div>
      )}
    </Wrapper>
  );
}