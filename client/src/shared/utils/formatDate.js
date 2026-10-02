export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const toInputDate = (d = new Date()) => new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD
export const firstOfMonth = () => { const d = new Date(); return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1)); };
