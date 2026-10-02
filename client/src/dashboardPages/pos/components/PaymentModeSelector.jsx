// client/src/dashboardPages/pos/components/PaymentModeSelector.jsx
import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import { POS_PAYMENT_MODES } from '../../../shared/utils/constants.js';
import { usePosCartStore } from '../../store/posCartStore.js';

const ICONS = { CASH: Banknote, UPI: Smartphone, CARD: CreditCard };

export default function PaymentModeSelector() {
  const { paymentMode, setPaymentMode } = usePosCartStore();
  return (
    <div className="grid grid-cols-3 gap-2">
      {POS_PAYMENT_MODES.map(({ value, label }) => {
        const Icon = ICONS[value];
        return (
          <button key={value} onClick={() => setPaymentMode(value)}
            className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium ${paymentMode === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        );
      })}
    </div>
  );
}