'use client';

import { useEffect, useState, useCallback } from 'react';

interface NodeLimitDetail {
  max_limit?: number;
}

interface Node {
  _id?: string;
  name?: string;
  alias_name?: string;
  status?: string;
  limits?: {
    streamer?: NodeLimitDetail;
    live?: NodeLimitDetail;
    playback?: NodeLimitDetail;
  };
  mediaMtxInfo?: {
    media_mtx_url?: string;
    ip_addr?: string;
    domain?: string;
    username?: string;
    password?: string;
  };
  description?: string;
  host_name?: string;
  api_url?: string;
  max_retries?: number;
  updatedAt?: string;
}

type SortKey =
  | 'sno'
  | 'name'
  | 'alias_name'
  | 'status'
  | 'streamer'
  | 'ip_addr'
  | 'domain'
  | 'media_mtx_url'
  | 'username'
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

/* ── Helpers ── */
const LimitBadge = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg ${color} min-w-[52px]`}>
    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</span>
    <span className="text-base font-black leading-tight">{value}</span>
  </div>
);

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1.5 text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

const MaskedPassword = ({ password }: { password: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-xs text-slate-700">{show ? password : '••••••••'}</span>
      <button
        onClick={() => setShow((s) => !s)}
        className="text-slate-400 hover:text-indigo-500 transition-colors"
        title={show ? 'Hide' : 'Show'}
      >
        {show ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
};

/* ── Column config ── */
interface ColDef {
  label: string;
  key: SortKey;
  fixed?: boolean;
}

const COLUMNS: ColDef[] = [
  { label: 'S.No',              key: 'sno',           fixed: true },
  { label: 'Name & Description',key: 'name',          fixed: true },
  { label: 'Alias',             key: 'alias_name' },
  { label: 'Status',            key: 'status' },
  { label: 'Limits',            key: 'streamer' },
  { label: 'IP Address',        key: 'ip_addr' },
  { label: 'Domain',            key: 'domain' },
  { label: 'MediaMTX URL',      key: 'media_mtx_url' },
  { label: 'Credentials',       key: 'username' },
  { label: 'Updated',           key: 'updatedAt' },
];

/* ── Pixel offsets for the two fixed columns ── */
// S.No col: ~56px wide (w-14). Name col starts at left-14.
const FIXED_LEFT_PX: Record<number, number> = { 0: 0, 1: 56 };

function getSortValue(n: Node, key: SortKey, idx: number): string | number {
  switch (key) {
    case 'sno':          return idx;
    case 'name':         return n.name?.toLowerCase() ?? '';
    case 'alias_name':   return n.alias_name?.toLowerCase() ?? '';
    case 'status':       return n.status?.toLowerCase() ?? '';
    case 'streamer':     return n.limits?.streamer?.max_limit ?? 0;
    case 'ip_addr':      return n.mediaMtxInfo?.ip_addr ?? '';
    case 'domain':       return n.mediaMtxInfo?.domain?.toLowerCase() ?? '';
    case 'media_mtx_url':return n.mediaMtxInfo?.media_mtx_url?.toLowerCase() ?? '';
    case 'username':     return n.mediaMtxInfo?.username?.toLowerCase() ?? '';
    case 'updatedAt':    return n.updatedAt ? new Date(n.updatedAt).getTime() : 0;
    default:             return '';
  }
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  useEffect(() => {
    async function getNodes() {
      try {
        const res = await fetch('/api/nodes', { cache: 'no-store' });
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        setNodes(data || []);
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
      } finally {
        setLoading(false);
      }
    }
    getNodes();
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDir('asc');
        return key;
      }
      // Same key: cycle asc → desc → null
      setSortDir((d) => {
        if (d === 'asc') return 'desc';
        if (d === 'desc') { return null; }
        return 'asc';
      });
      return key;
    });
  }, []);

  const filteredNodes = nodes.filter((n) => {
    const terms = [
      n.name, n.alias_name, n.status, n.description,
      n.mediaMtxInfo?.ip_addr, n.mediaMtxInfo?.domain,
      n.mediaMtxInfo?.media_mtx_url, n.mediaMtxInfo?.username,
    ].filter(Boolean).join(' ').toLowerCase();
    return terms.includes(search.toLowerCase());
  });

  const sortedNodes = (() => {
    if (!sortKey || sortDir === null) return filteredNodes;
    return [...filteredNodes].sort((a, b) => {
      const ai = filteredNodes.indexOf(a);
      const bi = filteredNodes.indexOf(b);
      const av = getSortValue(a, sortKey, ai);
      const bv = getSortValue(b, sortKey, bi);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  })();

  const totalPages = Math.ceil(sortedNodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNodes = sortedNodes.slice(startIndex, startIndex + itemsPerPage);

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

  const clearSort = () => { setSortKey(null); setSortDir(null); };

  return (
    <main className="min-h-screen bg-[#f4f6fb] p-5 sm:p-8 lg:p-10 font-sans antialiased">
      {/* ── Header ── */}
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1">
            Infrastructure
          </p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
            Nodes Dashboard
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            Monitor streaming nodes — limits, MediaMTX, credentials & connectivity
          </p>
        </div>
      </div>

      {/* ── Summary chips + Search ── */}
      {!loading && (
        <div className="flex flex-wrap justify-between gap-y-3 mb-6">
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Total Nodes', value: nodes.length, color: 'bg-white text-slate-700' },
              { label: 'Active', value: nodes.filter((n) => n.status === 'active').length, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Inactive', value: nodes.filter((n) => n.status === 'inactive').length, color: 'bg-amber-50 text-amber-700' },
              { label: 'Showing', value: filteredNodes.length, color: 'bg-indigo-50 text-indigo-700' },
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
              placeholder="Search name, alias, IP, domain…"
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
        {/*
          KEY LAYOUT:
          - Outer div: rounded card with overflow:hidden
          - Inner div: overflow-x-auto (scrollable)
          - table: border-collapse:separate so sticky borders work correctly
          - Fixed cols (S.No, Name): position:sticky with explicit left offset + z-index
          - A thin drop-shadow on the last fixed column creates a visual scroll divider
        */}
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-slate-100 text-sm"
            style={{ borderCollapse: 'separate', borderSpacing: 0 }}
          >
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {COLUMNS.map((col, colIdx) => {
                  const isFixed = !!col.fixed;
                  const isLastFixed = colIdx === 1;
                  const isActive = sortKey === col.key && sortDir !== null;

                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={isFixed ? { left: FIXED_LEFT_PX[colIdx], position: 'sticky', zIndex: 20 } : {}}
                      className={[
                        'px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none group transition-colors duration-100',
                        isFixed ? 'bg-slate-50' : '',
                        isFixed && !isActive ? 'hover:bg-slate-100/80' : '',
                        isLastFixed ? '' : '',
                        isActive ? 'text-indigo-600 bg-indigo-50/80' : 'text-slate-500',
                        !isFixed && !isActive ? 'hover:bg-slate-100/80' : '',
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
                      <p className="text-slate-400 text-sm font-medium">Loading nodes…</p>
                    </div>
                  </td>
                </tr>
              ) : currentNodes.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-24 text-center text-slate-400 italic text-sm">
                    {search.trim() ? 'No nodes match your search.' : 'No nodes found.'}
                  </td>
                </tr>
              ) : (
                currentNodes.map((n, idx) => (
                  <tr key={`${n._id || idx}`} className="group hover:bg-indigo-50/25 transition-colors duration-100">

                    {/* ── S.No — Fixed col 0 ── */}
                    <td
                      style={{ left: FIXED_LEFT_PX[0], position: 'sticky', zIndex: 10 }}
                      className="px-4 py-4 text-slate-400 font-medium text-center w-14 bg-white group-hover:bg-indigo-50/25 transition-colors duration-100"
                    >
                      {startIndex + idx + 1}
                    </td>

                    {/* ── Name & Description — Fixed col 1 ── */}
                    <td
                      style={{ left: FIXED_LEFT_PX[1], position: 'sticky', zIndex: 10 }}
                      className="px-4 py-4 min-w-[190px] max-w-[220px] bg-white group-hover:bg-indigo-50/25 transition-colors duration-100"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-900">{n.name || '—'}</span>
                        {n.description && (
                          <span className="text-[11px] text-slate-400 italic leading-snug max-w-[190px]">
                            {n.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ── Alias ── */}
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                        {n.alias_name || '—'}
                      </span>
                    </td>

                    {/* ── Status ── */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                          n.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                            : n.status === 'inactive'
                            ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            n.status === 'active'
                              ? 'bg-emerald-500 animate-pulse'
                              : n.status === 'inactive'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {n.status || 'unknown'}
                      </span>
                    </td>

                    {/* ── Limits ── */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <LimitBadge label="Str" value={n.limits?.streamer?.max_limit ?? 0} color="bg-violet-50 text-violet-700" />
                        <LimitBadge label="Live" value={n.limits?.live?.max_limit ?? 0} color="bg-sky-50 text-sky-700" />
                        <LimitBadge label="Play" value={n.limits?.playback?.max_limit ?? 0} color="bg-emerald-50 text-emerald-700" />
                      </div>
                    </td>

                    {/* ── IP Address ── */}
                    <td className="px-4 py-4">
                      {n.mediaMtxInfo?.ip_addr ? (
                        <div className="flex items-center">
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                            {n.mediaMtxInfo.ip_addr}
                          </span>
                          <CopyButton text={n.mediaMtxInfo.ip_addr} />
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* ── Domain ── */}
                    <td className="px-4 py-4 min-w-[160px]">
                      {n.mediaMtxInfo?.domain ? (
                        <div className="flex items-center">
                          <span className="text-xs text-slate-700 truncate max-w-[160px]" title={n.mediaMtxInfo.domain}>
                            {n.mediaMtxInfo.domain}
                          </span>
                          <CopyButton text={n.mediaMtxInfo.domain} />
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* ── MediaMTX URL ── */}
                    <td className="px-4 py-4 min-w-[180px]">
                      {n.mediaMtxInfo?.media_mtx_url ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={n.mediaMtxInfo.media_mtx_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={n.mediaMtxInfo.media_mtx_url}
                            className="font-mono text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-[180px] block hover:underline"
                          >
                            {n.mediaMtxInfo.media_mtx_url}
                          </a>
                          <CopyButton text={n.mediaMtxInfo.media_mtx_url} />
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* ── Credentials ── */}
                    <td className="px-4 py-4 min-w-[160px]">
                      <div className="flex flex-col gap-1">
                        {n.mediaMtxInfo?.username ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-6">U</span>
                            <span className="font-mono text-xs text-slate-700">{n.mediaMtxInfo.username}</span>
                            <CopyButton text={n.mediaMtxInfo.username} />
                          </div>
                        ) : null}
                        {n.mediaMtxInfo?.password ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-6">P</span>
                            <MaskedPassword password={n.mediaMtxInfo.password} />
                          </div>
                        ) : null}
                        {!n.mediaMtxInfo?.username && !n.mediaMtxInfo?.password && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* ── Updated ── */}
                    <td className="px-4 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {n.updatedAt
                        ? new Date(n.updatedAt).toLocaleString([], {
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
        {!loading && filteredNodes.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-800">
                {startIndex + 1}–{Math.min(currentPage * itemsPerPage, filteredNodes.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filteredNodes.length}</span> nodes
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