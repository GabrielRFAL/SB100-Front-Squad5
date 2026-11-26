import { useMemo, useState } from 'react';
import { Download, Filter, LineChart, Share2 } from 'lucide-react';

import { AGRONOMIC_ROWS, filterAgronomicRows, rowsToCsv } from './data-demo';

export function DataExplorer() {
  const [culture, setCulture] = useState('Todas');
  const [query, setQuery] = useState('');
  const [sortDescending, setSortDescending] = useState(true);
  const rows = useMemo(() => filterAgronomicRows(AGRONOMIC_ROWS, culture).filter((row) =>
    `${row.culture} ${row.region} ${row.period}`.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => sortDescending ? b.productivity - a.productivity : a.productivity - b.productivity), [culture, query, sortDescending]);
  const latest = rows.filter((row) => row.period === '2024');
  const maxProductivity = Math.max(...latest.map((row) => row.productivity), 1);

  function downloadCsv() {
    const url = URL.createObjectURL(new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sb100-demonstracao-agronomica.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function share() {
    if (navigator.share) await navigator.share({ title: 'SB100 · dados demonstrativos', text: 'Visualização demonstrativa do SB100.' });
    else await navigator.clipboard?.writeText(window.location.href);
  }

  return <section className="mt-8 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5" aria-labelledby="data-explorer-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2 text-emerald-800"><LineChart className="h-5 w-5" aria-hidden="true" /><h2 id="data-explorer-title" className="text-lg font-bold">Explorador de dados agronômicos</h2></div><p className="mt-1 text-xs text-emerald-900/70">Demonstração local · dados ilustrativos, não conectados a uma fonte real.</p></div>
      <div className="flex gap-2"><button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><Download className="h-4 w-4" aria-hidden="true" />CSV</button><button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"><Share2 className="h-4 w-4" aria-hidden="true" />Compartilhar</button></div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr]"><label className="text-sm font-semibold text-slate-700">Cultura<select value={culture} onChange={(event) => setCulture(event.target.value)} className="mt-1 block w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"><option>Todas</option><option>Citros</option><option>Milho</option><option>Café</option></select></label><label className="text-sm font-semibold text-slate-700">Filtrar tabela<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cultura, região ou período" className="mt-1 block w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" /></label></div>
    <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Produtividade em 2024</h3><p className="text-xs text-slate-500">sc/ha · comparação ilustrativa</p></div><Filter className="h-4 w-4 text-emerald-700" aria-hidden="true" /></div><div className="mt-4 space-y-3">{latest.length ? latest.map((row) => <div key={row.culture} className="grid grid-cols-[70px_1fr_48px] items-center gap-3 text-sm"><span className="font-medium text-slate-700">{row.culture}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${(row.productivity / maxProductivity) * 100}%` }} /></div><span className="text-right font-semibold text-emerald-900">{row.productivity}</span></div>) : <p className="text-sm text-slate-500">Nenhum dado para este filtro.</p>}</div></div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-900">Tabela explorável</h3><button type="button" onClick={() => setSortDescending((value) => !value)} className="text-xs font-semibold text-emerald-800 underline">Ordenar produtividade</button></div>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Cultura</th><th className="px-4 py-3">Região</th><th className="px-4 py-3">Período</th><th className="px-4 py-3">Produtividade (sc/ha)</th><th className="px-4 py-3">pH</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.culture}-${row.period}`} className="border-t border-slate-100"><td className="px-4 py-3 font-medium">{row.culture}</td><td className="px-4 py-3">{row.region}</td><td className="px-4 py-3">{row.period}</td><td className="px-4 py-3">{row.productivity}</td><td className="px-4 py-3">{row.ph.toFixed(1)}</td></tr>)}</tbody></table></div> : <p className="p-4 text-sm text-slate-500">Nenhum resultado encontrado.</p>}</div>
  </section>;
}
