'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

interface Device {
  _id: string;
  deviceId: string;
  orgName?: string;
  siteId: string;
  playbackConfig?: {
    node_alias_name?: string;
    containerStatus?: string;
    containerName?: string;
    error?: string;
  };
  liveStreamConfig?: {
    node_alias_name?: string;
  };
  analyticsConfig?: {
    node_alias_name?: string;
    containerStatus?: string;
    containerName?: string;
    error?: string;
  };
  deviceInfo?: {
    id?: string;
    name?: string;
    alias?: string;
    rtspUrl?: string;
    deviceType?: string;
  };
  playback?: { enabled?: boolean };
  appTypes?: string[];
  status: string;
  updatedAt?: string;
}

type SortKey =
  | 'sno'
  | 'deviceId'
  | 'name'
  | 'deviceType'
  | 'site'
  | 'rtspUrl'
  | 'appTypes'
  | 'playbackEnabled'
  | 'playbackNode'
  | 'liveNode'
  | 'analyticsNode'
  | 'status'
  | 'updatedAt';

type SortDir = 'asc' | 'desc' | null;

/* ── Sort Arrow Icon ── */
const SortIcon = ({ active, direction }: { active: boolean; direction: SortDir }) => {
  if (!active || direction === null) {
    return (
      <svg
        className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors duration-150 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
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

/* ── tiny helpers ── */
const StatusPill = ({ status }: { status?: string }) => {
  if (!status) return <span className="text-slate-400">—</span>;
  const isRunning = status === 'running';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
        isRunning
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {status}
    </span>
  );
};

const NodeCell = ({
  name,
  containerName,
  containerStatus,
  error,
}: {
  name?: string;
  containerName?: string;
  containerStatus?: string;
  error?: string;
}) => (
  <div className="flex flex-col gap-1 min-w-[130px]">
    <span className="font-medium text-slate-800 text-sm">{name || '—'}</span>
    {containerName && (
      <span className="text-[11px] text-slate-500 font-mono truncate max-w-[160px]" title={containerName}>
        {containerName}
      </span>
    )}
    {containerStatus && <StatusPill status={containerStatus} />}
    {error && (
      <span className="text-[11px] text-rose-500 truncate max-w-[160px]" title={error}>
        {error}
      </span>
    )}
  </div>
);

const AppTypeBadge = ({ type }: { type: string }) => {
  const map: Record<string, string> = {
    playback: 'bg-violet-50 text-violet-700 ring-violet-200',
    live: 'bg-sky-50 text-sky-700 ring-sky-200',
    analytics: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
  const cls = map[type] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ring-1 ${cls}`}>
      {type}
    </span>
  );
};

/* ── Column config ── */
interface ColDef {
  label: string;
  key: SortKey;
  fixed?: boolean;
}

const COLUMNS: ColDef[] = [
  { label: 'S.No',            key: 'sno',            fixed: true },
  { label: 'Name / Alias',    key: 'name',           fixed: true },
  { label: 'Type',            key: 'deviceType' },
  { label: 'Device ID',       key: 'deviceId' },
  { label: 'Site',            key: 'site' },
  { label: 'RTSP URL',        key: 'rtspUrl' },
  { label: 'App Types',       key: 'appTypes' },
  { label: 'Playback Enabled',key: 'playbackEnabled' },
  { label: 'Playback Node',   key: 'playbackNode' },
  { label: 'Live Node',       key: 'liveNode' },
  { label: 'Analytics Node',  key: 'analyticsNode' },
  { label: 'Status',          key: 'status' },
  { label: 'Updated',         key: 'updatedAt' },
];

/* S.No ~56px (w-14), Name/Alias starts at 56px */
const FIXED_LEFT_PX: Record<number, number> = { 0: 0, 1: 56 };

function getSortValue(d: Device, key: SortKey, idx: number): string | number {
  switch (key) {
    case 'sno':            return idx;
    case 'deviceId':       return d.deviceId?.toLowerCase() ?? '';
    case 'name':           return d.deviceInfo?.name?.toLowerCase() ?? '';
    case 'deviceType':     return d.deviceInfo?.deviceType?.toLowerCase() ?? '';
    case 'site':           return (d.siteId || d.orgName)?.toLowerCase() ?? '';
    case 'rtspUrl':        return d.deviceInfo?.rtspUrl?.toLowerCase() ?? '';
    case 'appTypes':       return (d.appTypes ?? []).join(',').toLowerCase();
    case 'playbackEnabled':return d.playback?.enabled ? 1 : 0;
    case 'playbackNode':   return d.playbackConfig?.node_alias_name?.toLowerCase() ?? '';
    case 'liveNode':       return d.liveStreamConfig?.node_alias_name?.toLowerCase() ?? '';
    case 'analyticsNode':  return d.analyticsConfig?.node_alias_name?.toLowerCase() ?? '';
    case 'status':         return d.status?.toLowerCase() ?? '';
    case 'updatedAt':      return d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
    default:               return '';
  }
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  useEffect(() => {
    async function getDevices() {
      try {
        const res = await axios.get('/api/devices');
        setDevices(res.data || []);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        setLoading(false);
      }
    }
    getDevices();
  }, []);

  const handleSort = useCallback((key: SortKey) => {
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

  const filteredDevices = devices.filter((d) => {
    const terms = [
      d.deviceId,
      d.deviceInfo?.id,
      d.deviceInfo?.name,
      d.deviceInfo?.alias,
      d.deviceInfo?.rtspUrl,
      d.deviceInfo?.deviceType,
      d.orgName,
      d.siteId,
      d.playbackConfig?.node_alias_name,
      d.playbackConfig?.containerName,
      d.liveStreamConfig?.node_alias_name,
      d.analyticsConfig?.node_alias_name,
      d.analyticsConfig?.containerName,
      ...(d.appTypes ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return terms.includes(search.toLowerCase());
  });

  const sortedDevices = (() => {
    if (!sortKey || sortDir === null) return filteredDevices;
    return [...filteredDevices].sort((a, b) => {
      const ai = filteredDevices.indexOf(a);
      const bi = filteredDevices.indexOf(b);
      const av = getSortValue(a, sortKey, ai);
      const bv = getSortValue(b, sortKey, bi);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  })();

  const totalPages = Math.ceil(sortedDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentDevices = sortedDevices.slice(startIndex, startIndex + itemsPerPage);

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

  return (
    <main className="min-h-screen bg-[#f4f6fb] p-5 sm:p-8 lg:p-10 font-sans antialiased">
      {/* ── Header ── */}
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1">
            Fleet Management
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
            Devices Dashboard
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            Cameras, nodes, streaming & analytics — all in one view
          </p>
        </div>
      </div>

      {/* ── Summary chips + Search ── */}
      {!loading && (
        <div className="flex flex-wrap justify-between gap-y-3 mb-6">
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Total Devices', value: devices.length,                                      color: 'bg-white text-slate-700' },
              { label: 'Active',        value: devices.filter((d) => d.status === 'active').length,  color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Inactive',      value: devices.filter((d) => d.status !== 'active').length,  color: 'bg-rose-50 text-rose-700' },
              { label: 'Showing',       value: filteredDevices.length,                               color: 'bg-indigo-50 text-indigo-700' },
            ].map((c) => (
              <div key={c.label} className={`${c.color} px-4 py-2 rounded-xl border border-slate-200/70 shadow-sm text-sm font-semibold flex items-center gap-2`}>
                <span className="text-base font-black">{c.value}</span>
                <span className="font-medium opacity-70">{c.label}</span>
              </div>
            ))}
          </div>

          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Search ID, alias, RTSP, node, app type…"
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

      {/* ── Table card ── */}
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
                      onClick={() => handleSort(col.key)}
                      style={isFixed ? { left: FIXED_LEFT_PX[colIdx], position: 'sticky', zIndex: 20 } : {}}
                      className={[
                        'px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none group transition-colors duration-100',
                        isFixed ? 'bg-slate-50' : '',
                        isActive ? 'text-indigo-600 bg-indigo-50/80' : 'text-slate-500 hover:bg-slate-100/80',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.label}</span>
                        <SortIcon active={isActive} direction={isActive ? sortDir : null} />
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
                      <p className="text-slate-400 text-sm font-medium">Loading devices…</p>
                    </div>
                  </td>
                </tr>
              ) : currentDevices.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-24 text-center text-slate-400 italic text-sm">
                    {search.trim() ? 'No devices match your search.' : 'No devices found.'}
                  </td>
                </tr>
              ) : (
                currentDevices.map((d, idx) => (
                  <tr key={d._id} className="group hover:bg-indigo-50/25 transition-colors duration-100">

                    {/* ── S.No — Fixed col 0 ── */}
                    <td
                      style={{ left: FIXED_LEFT_PX[0], position: 'sticky', zIndex: 10 }}
                      className="px-4 py-4 text-slate-400 font-medium text-center w-14 bg-white group-hover:bg-indigo-50/25 transition-colors duration-100"
                    >
                      {startIndex + idx + 1}
                    </td>

                    {/* ── Name / Alias — Fixed col 1 ── */}
                    <td
                      style={{ left: FIXED_LEFT_PX[1], position: 'sticky', zIndex: 10 }}
                      className="px-4 py-4 min-w-[150px] bg-white group-hover:bg-indigo-50/25 transition-colors duration-100"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-900">{d.deviceInfo?.name || '—'}</span>
                        <span className="text-xs text-slate-500 italic">{d.deviceInfo?.alias || '—'}</span>
                      </div>
                    </td>

                    {/* ── Type ── */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {d.deviceInfo?.deviceType ? (
                        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 tracking-wide">
                          {d.deviceInfo.deviceType.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* ── Device ID ── */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md w-fit whitespace-nowrap">
                          {d.deviceId}
                        </span>
                        {d.deviceInfo?.id && d.deviceInfo.id !== d.deviceId && (
                          <span className="font-mono text-[11px] text-slate-400">{d.deviceInfo.id}</span>
                        )}
                      </div>
                    </td>

                    {/* ── Site ── */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-slate-700 font-medium">{d.siteId || d.orgName || '—'}</span>
                    </td>

                    {/* ── RTSP URL ── */}
                    <td className="px-4 py-4 max-w-[200px]">
                      {d.deviceInfo?.rtspUrl ? (
                        <span
                          className="font-mono text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md block truncate"
                          title={d.deviceInfo.rtspUrl}
                        >
                          {d.deviceInfo.rtspUrl}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* ── App Types ── */}
                    <td className="px-4 py-4">
                      {d.appTypes && d.appTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {d.appTypes.map((t) => <AppTypeBadge key={t} type={t} />)}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* ── Playback Enabled ── */}
                    <td className="px-4 py-4 text-center">
                      {d.playback?.enabled !== undefined ? (
                        d.playback.enabled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full ring-1 ring-emerald-200">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs bg-slate-100 px-2.5 py-0.5 rounded-full">
                            No
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* ── Playback Node ── */}
                    <td className="px-4 py-4">
                      <NodeCell
                        name={d.playbackConfig?.node_alias_name}
                        containerName={d.playbackConfig?.containerName}
                        containerStatus={d.playbackConfig?.containerStatus}
                        error={d.playbackConfig?.error}
                      />
                    </td>

                    {/* ── Live Node ── */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <span className="font-medium text-slate-800 text-sm">
                          {d.liveStreamConfig?.node_alias_name || '—'}
                        </span>
                      </div>
                    </td>

                    {/* ── Analytics Node ── */}
                    <td className="px-4 py-4">
                      <NodeCell
                        name={d.analyticsConfig?.node_alias_name}
                        containerName={d.analyticsConfig?.containerName}
                        containerStatus={d.analyticsConfig?.containerStatus}
                        error={d.analyticsConfig?.error}
                      />
                    </td>

                    {/* ── Overall Status ── */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                          d.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                            : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {d.status}
                      </span>
                    </td>

                    {/* ── Updated ── */}
                    <td className="px-4 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {d.updatedAt
                        ? new Date(d.updatedAt).toLocaleString([], {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {!loading && filteredDevices.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-800">
                {startIndex + 1}–{Math.min(currentPage * itemsPerPage, filteredDevices.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filteredDevices.length}</span> devices
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                Rows:
                <select
                  className="bg-transparent focus:outline-none text-slate-800 font-semibold cursor-pointer"
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                >
                  {[5, 10, 15, 20, 50, 100].map((n) => (
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
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs select-none">…</span>
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