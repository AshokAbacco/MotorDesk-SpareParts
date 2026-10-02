import EmptyState from './EmptyState.jsx';
import Spinner from './Spinner.jsx';

/**
 * columns: [{ key, header, render?: (row) => node, className? }]
 */
export default function Table({ columns, rows, loading, rowKey = 'id', onRowClick, empty = 'No records found' }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-[12px]">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && rows.map((row) => (
              <tr key={row[rowKey]} onClick={() => onRowClick?.(row)} className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}>
                {columns.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-4 py-3 text-slate-700 ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="py-12"><Spinner /></div>}
      {!loading && rows.length === 0 && <EmptyState title={empty} />}
    </div>
  );
}
