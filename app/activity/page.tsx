'use client';

import { useEffect, useState, useCallback } from 'react';

interface Activity {
  _id?: string;
  device_id?: string;
  node_alias_name?: string;
  type?: string;
  action?: string;
  time?: string;
  errorMessage?: string | null;
}

/* ── Helpers ── */
const TYPE_STYLES: Record<string, string> = {
  live:      'bg-sky-50 text-sky-700 ring-sky-200',
  playback:  'bg-violet-50 text-violet-700 ring-violet-200',
  analytics: 'bg-amber-50 text-amber-700 ring-amber-200',
  streamer:  'bg-rose-50 text-rose-700 ring-rose-200',
};

const ACTION_STYLES: Record<string, string> = {
  started: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  stopped: 'bg-rose-50 text-rose-700 ring-rose-200',
  error:   'bg-red-50 text-red-700 ring-red-200',
  restart: 'bg-orange-50 text-orange-700 ring-orange-200',
};

const TypeBadge = ({ type }: { type?: string }) => {
  if (!type) return <span className="text-slate-400">—</span>;
  const cls = TYPE_STYLES[type.toLowerCase()] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ring-1 ${cls}`}>
      {type}
    </span>
  );
};

const ActionBadge = ({ action }: { action?: string }) => {
  if (!action) return <span className="text-slate-400">—</span>;
  const key = Object.keys(ACTION_STYLES).find((k) => action.toLowerCase().includes(k));
  const cls = key ? ACTION_STYLES[key] : 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
};

const formatTime = (iso?: string) => {
  if (!iso) return { date: '—', time: '—' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

/* ── Sort Icon — same as Nodes/Devices pages ── */
type SortDir = 'asc' | 'desc' | null;

const SortIcon = ({ active, direction }: { active: boolean; direction: SortDir }) => {
  if (!active || direction === null) {
    return (
      <svg
        className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors duration-150 shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return direction === 'asc' ? (
    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
};

/* ── Column config ── */
type SortKey = 'sno' | 'deviceId' | 'nodeAlias' | 'type' | 'action' | 'datetime' | 'error';

interface ColDef {
  key: SortKey;
  label: string;
  fixed?: boolean;
  sortable: boolean;
}

const COLUMNS: ColDef[] = [
  { key: 'sno',       label: 'S.No',       fixed: true,  sortable: false },
  { key: 'deviceId',  label: 'Device ID',  fixed: true,  sortable: true  },
  { key: 'nodeAlias', label: 'Node Alias', sortable: true  },
  { key: 'type',      label: 'Type',       sortable: true  },
  { key: 'action',    label: 'Action',     sortable: true  },
  { key: 'datetime',  label: 'Date / Time',sortable: true  },
  { key: 'error',     label: 'Error',      sortable: true  },
];

/* S.No ~56px (w-14), Device ID starts at 56px */
const FIXED_LEFT_PX: Record<number, number> = { 0: 0, 1: 56 };

function getSortValue(a: Activity, key: SortKey, idx: number): string | number {
  switch (key) {
    case 'sno':       return idx;
    case 'deviceId':  return a.device_id?.toLowerCase() ?? '';
    case 'nodeAlias': return a.node_alias_name?.toLowerCase() ?? '';
    case 'type':      return a.type?.toLowerCase() ?? '';
    case 'action':    return a.action?.toLowerCase() ?? '';
    case 'datetime':  return a.time ? new Date(a.time).getTime() : 0;
    case 'error':     return a.errorMessage?.toLowerCase() ?? '';
    default:          return '';
  }
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  useEffect(() => {
    async function getActivities() {
      try {
        const res = await fetch('/api/activities', { cache: 'no-store' });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setActivities(data || []);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    }
    getActivities();
  }, []);

  const handleSort = useCallback((key: SortKey, sortable: boolean) => {
    if (!sortable) return;
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDir('asc');
        return key;
      }
      setSortDir((d) => {
        if (d === 'asc') return 'desc';
        if (d === 'desc') return null;
        return 'asc';
      });
      return key;
    });
  }, []);

  const clearSort = () => { setSortKey(null); setSortDir(null); };

  const uniqueTypes = Array.from(new Set(activities.map((a) => a.type).filter(Boolean))) as string[];

  const baseFiltered = activities.filter((a) => {
    const terms = [a.device_id, a.node_alias_name, a.type, a.action, a.errorMessage]
      .filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = terms.includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const sortedActivities = (() => {
    if (!sortKey || sortDir === null) return baseFiltered;
    return [...baseFiltered].sort((a, b) => {
      const ai = baseFiltered.indexOf(a);
      const bi = baseFiltered.indexOf(b);
      const av = getSortValue(a, sortKey, ai);
      const bv = getSortValue(b, sortKey, bi);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  })();

  const totalPages = Math.ceil(sortedActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentActivities = sortedActivities.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (currentPage >= totalPages - 3)
      return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages];
  })();

  const errorCount = activities.filter((a) => a.errorMessage).length;

  return (
    <main className="min-h-screen bg-[#f4f6fb] p-5 sm:p-8 lg:p-10 font-sans antialiased">
      {/* ── Header ── */}
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1">
            System Monitoring
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
            Activity Logs
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            Track device actions, stream events & system activity in real time
          </p>
        </div>
      </div>

      {/* ── Summary chips + Type Filter Dropdown + Search ── */}
      {!loading && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: 'Total',     value: activities.length,                                       color: 'bg-white text-slate-700' },
              { label: 'Live',      value: activities.filter((a) => a.type === 'live').length,       color: 'bg-sky-50 text-sky-700' },
              { label: 'Playback',  value: activities.filter((a) => a.type === 'playback').length,   color: 'bg-violet-50 text-violet-700' },
              { label: 'Analytics', value: activities.filter((a) => a.type === 'analytics').length,  color: 'bg-amber-50 text-amber-700' },
              { label: 'Errors',    value: errorCount, color: errorCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-400' },
              { label: 'Showing',   value: sortedActivities.length,                                 color: 'bg-indigo-50 text-indigo-700' },
            ].map((c) => (
              <div key={c.label} className={`${c.color} px-4 py-2 rounded-xl border border-slate-200/70 shadow-sm text-sm font-semibold flex items-center gap-2`}>
                <span className="text-base font-black">{c.value}</span>
                <span className="font-medium opacity-70">{c.label}</span>
              </div>
            ))}

            {/* ── Type Filter Dropdown — inline with chips ── */}
            {uniqueTypes.length > 0 && (
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className={[
                    'appearance-none pl-3 pr-8 py-2 rounded-xl border shadow-sm text-xs font-semibold',
                    'cursor-pointer transition-all focus:outline-none focus:ring-4 focus:ring-indigo-100',
                    typeFilter !== 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 focus:border-indigo-500'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 focus:border-indigo-400',
                  ].join(' ')}
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <span className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${typeFilter !== 'all' ? 'text-white' : 'text-slate-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Search device, node, action, error…"
              className="w-full pl-3 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm
                         focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100
                         transition-all placeholder:text-slate-400 text-slate-800 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      )}

      {/* ── Active sort pill ── */}
      {sortKey && sortDir && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Sorted by</span>
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
            {COLUMNS.find((c) => c.key === sortKey)?.label}
            {sortDir === 'asc' ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            )}
            <button onClick={clearSort} className="ml-0.5 hover:text-indigo-900 transition-colors" title="Clear sort">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </span>
          <span className="text-xs text-slate-400">— click any column header to sort; click again to reverse; third click clears</span>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-slate-100 text-sm"
            style={{ borderCollapse: 'separate', borderSpacing: 0 }}
          >
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {COLUMNS.map((col, colIdx) => {
                  const isFixed = !!col.fixed;
                  const isActive = sortKey === col.key && sortDir !== null;

                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key, col.sortable)}
                      style={isFixed ? { left: FIXED_LEFT_PX[colIdx], position: 'sticky', zIndex: 20 } : {}}
                      className={[
                        'px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap select-none group transition-colors duration-100',
                        col.sortable ? 'cursor-pointer' : 'cursor-default',
                        isFixed ? 'bg-slate-50' : '',
                        isActive ? 'text-indigo-600 bg-indigo-50/80' : 'text-slate-500 hover:bg-slate-100/80',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {col.sortable && (
                          <SortIcon active={isActive} direction={isActive ? sortDir : null} />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-400 text-sm font-medium">Loading activities…</p>
                    </div>
                  </td>
                </tr>
              ) : currentActivities.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-24 text-center text-slate-400 italic text-sm">
                    {search.trim() || typeFilter !== 'all'
                      ? 'No activities match your filters.'
                      : 'No activities found.'}
                  </td>
                </tr>
              ) : (
                currentActivities.map((a, idx) => {
                  const t = formatTime(a.time);
                  const hasError = !!a.errorMessage;
                  return (
                    <tr
                      key={`${a._id || idx}`}
                      className={`group transition-colors duration-100 hover:bg-indigo-50/25 ${hasError ? 'bg-rose-50/20' : ''}`}
                    >
                      {/* ── S.No — Fixed col 0 ── */}
                      <td
                        style={{ left: FIXED_LEFT_PX[0], position: 'sticky', zIndex: 10 }}
                        className={`px-4 py-4 text-slate-400 font-medium text-center w-14 transition-colors duration-100 ${hasError ? 'bg-rose-50/20' : 'bg-white'} group-hover:bg-indigo-50/25`}
                      >
                        {startIndex + idx + 1}
                      </td>

                      {/* ── Device ID — Fixed col 1 ── */}
                      <td
                        style={{ left: FIXED_LEFT_PX[1], position: 'sticky', zIndex: 10 }}
                        className={`px-4 py-4 transition-colors duration-100 ${hasError ? 'bg-rose-50/20' : 'bg-white'} group-hover:bg-indigo-50/25`}
                      >
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                          {a.device_id || '—'}
                        </span>
                      </td>

                      {/* ── Node Alias ── */}
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md whitespace-nowrap">
                          {a.node_alias_name || '—'}
                        </span>
                      </td>

                      {/* ── Type ── */}
                      <td className="px-4 py-4">
                        <TypeBadge type={a.type} />
                      </td>

                      {/* ── Action ── */}
                      <td className="px-4 py-4 min-w-[180px]">
                        <ActionBadge action={a.action} />
                      </td>

                      {/* ── Date / Time (merged) ── */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-slate-700">{t.date}</span>
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md w-fit">
                            {t.time}
                          </span>
                        </div>
                      </td>

                      {/* ── Error ── */}
                      <td className="px-4 py-4 min-w-[160px]">
                        {a.errorMessage ? (
                          <div className="flex items-start gap-1.5">
                            <svg className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            <span className="text-xs text-rose-600 font-medium leading-snug">{a.errorMessage}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-200 font-semibold">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            No error
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {!loading && sortedActivities.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-800">
                {startIndex + 1}–{Math.min(currentPage * itemsPerPage, sortedActivities.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{sortedActivities.length}</span> activities
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                Rows:
                <select
                  className="bg-transparent focus:outline-none text-slate-800 font-semibold cursor-pointer"
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                  {[5, 10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Prev
                </button>

                {pageNumbers.map((p, i) =>
                  p === '…' ? (
                    <span key={`e-${i}`} className="px-2 text-slate-400 text-xs select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => goToPage(p as number)}
                      className={`min-w-[2rem] px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                        p === currentPage
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}