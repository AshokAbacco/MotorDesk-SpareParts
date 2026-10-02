import { Outlet } from 'react-router-dom';
import Sidebar, { ADMIN_NAV } from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar nav={ADMIN_NAV} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
