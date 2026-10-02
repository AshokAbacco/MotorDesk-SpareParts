import { formatCurrency } from '../../../shared/utils/formatCurrency.js';

/** Totals come from the server (/pos/quote) so the screen always matches the invoice */
export default function GstSummary({ quote, loading }) {
  const row = (label, value, strong) => (
    <div className={`flex justify-between ${strong ? 'text-base font-semibold text-slate-900' : 'text-sm text-slate-600'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
  if (!quote) return null;
  return (
    <div className={`space-y-1 transition-opacity ${loading ? 'opacity-50' : ''}`}>
      {row('Taxable value', formatCurrency(quote.grossSubtotal))}
      {quote.discount > 0 && row('Discount', `− ${formatCurrency(quote.discount)}`)}
      {quote.interState ? row('IGST', formatCurrency(quote.igst)) : (
        <>
          {row('CGST', formatCurrency(quote.cgst))}
          {row('SGST', formatCurrency(quote.sgst))}
        </>
      )}
      <div className="border-t border-slate-200 pt-2">{row('Grand total', formatCurrency(quote.grandTotal), true)}</div>
    </div>
  );
}
