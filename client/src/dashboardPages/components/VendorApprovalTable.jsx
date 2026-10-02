// client/src/dashboardPages/admin/components/VendorApprovalTable.jsx
import { Ban, CheckCircle2, XCircle } from 'lucide-react';
import Button from '../../../shared/ui/Button.jsx';
import Table from '../../../shared/ui/Table.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { INVENTORY_TYPE_LABELS } from '../../../shared/utils/inventoryType.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function VendorApprovalTable({ rows, loading, onStatus, busyId }) {
  const columns = [
    { key: 'shop', header: 'Shop', render: (v) => <div><p className="font-medium text-slate-800">{v.shopName}</p><p className="text-xs text-slate-500">{v.city ? `${v.city}, ` : ''}{v.state}</p><p className="text-xs font-medium text-brand-700">{INVENTORY_TYPE_LABELS[v.inventoryType]}</p></div> },
    { key: 'owner', header: 'Owner', render: (v) => <div><p>{v.user.name}</p><p className="text-xs text-slate-500">{v.user.email} · {v.user.phone}</p></div> },
    { key: 'gstin', header: 'GSTIN', render: (v) => <span className="font-mono text-xs">{v.gstin || '—'}</span> },
    { key: 'plan', header: 'Plan', render: (v) => v.subscriptions[0]?.plan.name ?? 'Free' },
    { key: 'usage', header: 'SKUs / Bills', render: (v) => `${v._count.inventory} / ${v._count.invoices}` },
    { key: 'joined', header: 'Joined', render: (v) => formatDate(v.createdAt) },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v.status} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (v) => (
        <div className="flex justify-end gap-1">
          {v.status !== 'APPROVED' && <Button size="sm" variant="success" icon={CheckCircle2} loading={busyId === `${v.id}APPROVED`} onClick={() => onStatus(v, 'APPROVED')}>Approve</Button>}
          {v.status === 'PENDING' && <Button size="sm" variant="secondary" icon={XCircle} loading={busyId === `${v.id}REJECTED`} onClick={() => onStatus(v, 'REJECTED')}>Reject</Button>}
          {v.status === 'APPROVED' && <Button size="sm" variant="secondary" icon={Ban} loading={busyId === `${v.id}SUSPENDED`} onClick={() => onStatus(v, 'SUSPENDED')}>Suspend</Button>}
        </div>
      ),
    },
  ];
  return <Table columns={columns} rows={rows} loading={loading} empty="No shops in this status" />;
}