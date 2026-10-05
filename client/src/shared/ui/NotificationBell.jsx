// client/src/shared/ui/NotificationBell.jsx
import {
  BadgeIndianRupee, Bell, BellOff, CheckCheck, CheckCircle2, Clock, Package, PackageCheck, ShoppingBag, Trash2, Truck, X, XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  clearAllNotifications, deleteNotification, getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead,
  NOTIFICATION_EVENT,
} from '../notifications.api.js';

const POLL_MS = 30_000; // checks for new notifications every 30s while the tab is visible

// Icon + colour per notification type (types come from server/src/notifications/notifications.service.js)
const LOOK = {
  ORDER_NEW: { icon: ShoppingBag, cls: 'bg-brand-50 text-brand-600' },
  ORDER_PLACED: { icon: PackageCheck, cls: 'bg-brand-50 text-brand-600' },
  PAYMENT_DUE: { icon: Clock, cls: 'bg-amber-50 text-amber-600' },
  PAYMENT_SUBMITTED: { icon: Clock, cls: 'bg-amber-50 text-amber-600' },
  PAYMENT_RECEIVED: { icon: BadgeIndianRupee, cls: 'bg-emerald-50 text-emerald-600' },
  ORDER_ACCEPTED: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  ORDER_PACKED: { icon: Package, cls: 'bg-indigo-50 text-indigo-600' },
  ORDER_SHIPPED: { icon: Truck, cls: 'bg-sky-50 text-sky-600' },
  ORDER_DELIVERED: { icon: PackageCheck, cls: 'bg-emerald-50 text-emerald-600' },
  ORDER_CANCELLED: { icon: XCircle, cls: 'bg-red-50 text-red-600' },
};
const DEFAULT_LOOK = { icon: Bell, cls: 'bg-slate-100 text-slate-500' };

function timeAgo(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Bell icon with unread count + dropdown list. Used in the vendor Topbar and the customer Navbar.
 * Each user only ever sees their own notifications (the server filters by the logged-in user).
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const lastSeenAt = useRef(undefined); // createdAt of the newest notification we already know about (undefined = first check)
  const boxRef = useRef(null);

  // ── unread count (polled) — pops a toast when something new arrives
  const checkCount = useCallback(async () => {
    try {
      const { data } = await getUnreadCount();
      setCount(data.count);
      const latestAt = data.latest ? new Date(data.latest.createdAt).getTime() : 0;
      // Only something newer than what we've seen counts as new (deleting/reading old ones never pops a toast)
      if (lastSeenAt.current !== undefined && latestAt > lastSeenAt.current) {
        toast(data.latest.title, { icon: '🔔', duration: 5000 });
        window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: data.latest }));
      }
      lastSeenAt.current = Math.max(lastSeenAt.current ?? 0, latestAt);
    } catch { /* offline / server waking up — try again next tick */ }
  }, []);

  useEffect(() => {
    checkCount();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') checkCount(); }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && checkCount();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [checkCount]);

  // ── list (loaded when the dropdown opens)
  const loadPage = useCallback(async (before) => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 15, ...(before && { before }) });
      setItems((prev) => (before ? [...prev, ...res.data] : res.data));
      setMeta(res.meta);
      setCount(res.meta.unread);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) { setConfirmClear(false); loadPage(); } }, [open, loadPage]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const onItem = (n) => {
    if (!n.readAt) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setCount((c) => Math.max(0, c - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const onReadAll = async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt ?? now })));
      setCount(0);
    } catch (e) { toast.error(e.message); }
  };

  // Delete one — removed from the list and the bell count updates right away; put back if the server says no
  const onDelete = async (n) => {
    const before = items;
    setItems((list) => list.filter((x) => x.id !== n.id));
    if (!n.readAt) setCount((c) => Math.max(0, c - 1));
    try {
      const { data } = await deleteNotification(n.id);
      setCount(data.unread);
      setMeta((m) => m && { ...m, total: Math.max(0, m.total - 1) });
      // Panel emptied but older ones exist → load them
      if (before.length === 1 && meta?.hasMore) loadPage();
    } catch (e) {
      setItems(before);
      if (!n.readAt) setCount((c) => c + 1);
      toast.error(e.message);
    }
  };

  const onClearAll = async () => {
    const before = { items, count, meta };
    setItems([]); setCount(0); setMeta((m) => m && { ...m, total: 0, hasMore: false }); setConfirmClear(false);
    try {
      await clearAllNotifications();
    } catch (e) {
      setItems(before.items); setCount(before.count); setMeta(before.meta);
      toast.error(e.message);
    }
  };

  const hasMore = Boolean(meta?.hasMore);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative rounded-lg p-2 transition ${open ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
        aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className={`h-5 w-5 ${count ? 'origin-top animate-ring' : ''}`} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <p className="whitespace-nowrap font-semibold text-slate-900">
              Notifications {count > 0 && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{count} new</span>}
            </p>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button type="button" onClick={onReadAll} className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50" title="Mark all as read">
                  <CheckCheck className="h-3.5 w-3.5" /> <span className="hidden min-[400px]:inline">Mark all read</span>
                </button>
              )}
              {items.length > 0 && (
                <button type="button" onClick={() => setConfirmClear(true)} className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" title="Clear all notifications">
                  <Trash2 className="h-3.5 w-3.5" /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Clear all needs a second click */}
          {confirmClear && (
            <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-800">
              <span>{(meta?.total ?? items.length) === 1 ? 'Delete this notification?' : `Delete all ${meta?.total ?? items.length} notifications?`} This can't be undone.</span>
              <span className="flex shrink-0 gap-1.5">
                <button type="button" onClick={() => setConfirmClear(false)} className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-white">Cancel</button>
                <button type="button" onClick={onClearAll} className="rounded-md bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700">Clear all</button>
              </span>
            </div>
          )}

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {!items.length && loading && <p className="px-4 py-10 text-center text-sm text-slate-400">Loading…</p>}
            {!items.length && !loading && (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><BellOff className="h-5 w-5 text-slate-400" /></span>
                <p className="mt-3 text-sm font-medium text-slate-700">No notifications yet</p>
                <p className="mt-1 text-xs text-slate-500">Order updates will show up here.</p>
              </div>
            )}

            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const { icon: Icon, cls } = LOOK[n.type] ?? DEFAULT_LOOK;
                const unread = !n.readAt;
                return (
                  <li key={n.id} className={`group relative flex transition hover:bg-slate-50 ${unread ? 'bg-brand-50/40' : ''}`}>
                    <button
                      type="button"
                      onClick={() => onItem(n)}
                      className="flex min-w-0 flex-1 gap-3 py-3 pl-4 pr-1 text-left focus-visible:bg-slate-50 focus-visible:outline-none"
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}`}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{n.body}</span>
                        <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                      </span>
                      {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                    </button>
                    {/* Delete — always visible on phones, on hover / keyboard focus on larger screens */}
                    <button
                      type="button"
                      onClick={() => onDelete(n)}
                      className="mr-2 mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`Delete notification: ${n.title}`}
                      title="Delete"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <button type="button" disabled={loading} onClick={() => loadPage(items[items.length - 1]?.createdAt)}
                className="w-full border-t border-slate-100 py-2.5 text-center text-xs font-medium text-brand-700 hover:bg-slate-50 disabled:text-slate-400">
                {loading ? 'Loading…' : 'Show older'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}