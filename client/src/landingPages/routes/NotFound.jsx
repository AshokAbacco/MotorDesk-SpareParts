import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../../shared/ui/EmptyState.jsx';

export default function NotFound() {
  return <EmptyState icon={Compass} title="Page not found" description="The page you are looking for doesn’t exist." action={<Link to="/" className="text-brand-600">Go home</Link>} />;
}
