import { Plus } from 'lucide-react';
import { useState } from 'react';
import useFetch from '../../../shared/hooks/useFetch.js';
import Button from '../../../shared/ui/Button.jsx';
import Spinner from '../../../shared/ui/Spinner.jsx';
import { getAllPlans } from '../plans.api.js';
import PlanCard from './PlanCard.jsx';
import PlanFormModal from './PlanFormModal.jsx';

export default function PlansPage() {
  const { data, loading, reload } = useFetch(getAllPlans, []);
  const [editing, setEditing] = useState(undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Subscription plans</h1>
          <p className="text-sm text-slate-500">What shops pay to use MotorDesk. SKU limits are enforced when they add inventory.</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing(null)}>New plan</Button>
      </div>
      {loading ? <Spinner /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => <PlanCard key={p.id} plan={p} onEdit={setEditing} />)}
        </div>
      )}
      <PlanFormModal open={editing !== undefined} plan={editing} onClose={() => setEditing(undefined)} onSaved={reload} />
    </div>
  );
}
