/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, 
  BarChart3, 
  LayoutDashboard, 
  AlertCircle, 
  RefreshCcw, 
  FileSpreadsheet, 
  Users, 
  ClipboardList, 
  Package,
  ChevronRight,
  Filter,
  X,
  Maximize2,
  Minimize2,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { DashboardData, PurchaseRecord, AppMode } from './types';
import { processFile, formatCurrency, formatFullCurrency } from './utils/processFile';

type Screen = 'selection' | 'upload' | 'processing' | 'dashboard' | 'error';

function fmtBRLSimple(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toString();
}

function InventoryDashboardView({ 
  data, 
  filteredData,
  filters,
  setFilters
}: { 
  data: DashboardData, 
  filteredData: any,
  filters: { filial: string, group: string, criterio: string, search: string, abc: string },
  setFilters: { 
    setFilial: (v: string) => void, 
    setGroup: (v: string) => void, 
    setCriterio: (v: string) => void, 
    setSearch: (v: string) => void,
    setAbc: (v: string) => void
  }
}) {
  const [page, setPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const perPage = 80;
  
  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);
  
  const totalSaldo = useMemo(() => filteredData.filtered.reduce((acc: number, r: any) => acc + r.saldo, 0), [filteredData.filtered]);
  const totalMov = useMemo(() => filteredData.filtered.reduce((acc: number, r: any) => acc + r.total_mov, 0), [filteredData.filtered]);
  const uniqueItems = useMemo(() => new Set(filteredData.filtered.map((r: any) => r.cod)).size, [filteredData.filtered]);
  const uniqueGroups = useMemo(() => new Set(filteredData.filtered.map((r: any) => r.grupo)).size, [filteredData.filtered]);
  const zeroSaldo = useMemo(() => filteredData.filtered.filter((r: any) => r.saldo <= 0).length, [filteredData.filtered]);
  const semMov = useMemo(() => filteredData.filtered.filter((r: any) => r.total_mov === 0).length, [filteredData.filtered]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((name, i) => ({
      name,
      value: filteredData.filtered.reduce((acc: number, r: any) => acc + (r.meses[i] || 0), 0)
    }));
  }, [filteredData.filtered]);

  const topGrupos = useMemo(() => {
    const agg: Record<string, number> = {};
    filteredData.filtered.forEach((r: any) => {
      agg[r.grupo] = (agg[r.grupo] || 0) + r.total_mov;
    });
    return Object.entries(agg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData.filtered]);

  const filialAgg = useMemo(() => {
    const agg: Record<string, number> = {};
    filteredData.filtered.forEach((r: any) => {
      agg[r.filial] = (agg[r.filial] || 0) + r.total_mov;
    });
    return agg;
  }, [filteredData.filtered]);

  const totalFilialMov = useMemo(() => Object.values(filialAgg).reduce((a: number, v: number) => a + v, 0), [filialAgg]);

  const CRIT_LABELS: Record<string, string> = {
    URGENTE: 'Urgente',
    COMPRAR_JA: 'Comprar já',
    COMPRAR_BREVE: 'Comprar em breve',
    OK: 'OK',
    ESTOQUE_ALTO: 'Estoque alto',
    SEM_GIRO: 'Sem giro',
    SEM_MOVIMENTO: 'Sem movimento'
  };

  const CRIT_COLORS: Record<string, string> = {
    URGENTE: '#ff3d3d',
    COMPRAR_JA: '#ff8c00',
    COMPRAR_BREVE: '#f5c400',
    OK: '#22c55e',
    ESTOQUE_ALTO: '#3b82f6',
    SEM_GIRO: '#a855f7',
    SEM_MOVIMENTO: '#444c60'
  };

  const COLORS = ['#4f7cff', '#38e2a0', '#ffc94a', '#b57bff', '#06b6d4', '#ff6b6b'];

  const slice = filteredData.filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filteredData.filtered.length / perPage);

  const maxTotalMov = useMemo(() => Math.max(...filteredData.filtered.map((r: any) => r.total_mov), 1), [filteredData.filtered]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {[
          { 
            label: 'Saldo Total', 
            value: totalSaldo.toLocaleString(), 
            sub: 'Visão Geral de Estoque', 
            color: '#4f7cff', 
            onClick: () => { setFilters.setCriterio(''); setFilters.setSearch(''); setFilters.setAbc(''); },
            active: !filters.criterio && !filters.abc && !filters.search
          },
          { 
            label: 'Itens Curva A', 
            value: filteredData.filtered.filter((r: any) => r.curva === 'A').length.toLocaleString(), 
            sub: '80% do GIRO TOTAL', 
            color: '#ef4444',
            onClick: () => { setFilters.setAbc(filters.abc === 'A' ? '' : 'A'); },
            active: filters.abc === 'A'
          },
          { 
            label: 'Itens Únicos', 
            value: uniqueItems.toLocaleString(), 
            sub: 'Limpar todos os filtros', 
            color: '#22c55e',
            onClick: () => { setFilters.setFilial(''); setFilters.setGroup(''); setFilters.setCriterio(''); setFilters.setSearch(''); setFilters.setAbc(''); },
            active: false
          },
          { 
            label: 'Grupos', 
            value: uniqueGroups, 
            sub: 'Categorias ativas', 
            color: '#eab308',
            onClick: () => { setFilters.setGroup(''); },
            active: !!filters.group
          },
          { 
            label: 'Precisa Comprar', 
            value: filteredData.filtered.filter((r: any) => 
              ['URGENTE', 'COMPRAR_JA', 'COMPRAR_BREVE'].includes(r.criterio) && 
              r.total_mov > 0 && 
              r.saldo_inicial !== 0
            ).length, 
            sub: 'Filtro: REPOSIÇÃO', 
            color: '#f97316', 
            valueColor: '#f97316', 
            onClick: () => setFilters.setCriterio(filters.criterio === 'COMPRAR_COMBO' ? '' : 'COMPRAR_COMBO'),
            active: filters.criterio === 'COMPRAR_COMBO'
          },
          { 
            label: 'Parados +12m', 
            value: filteredData.filtered.filter((r: any) => r.total_mov === 0 && r.saldo > 0).length, 
            sub: 'Giro Zero + Saldo', 
            color: '#6366f1',
            onClick: () => setFilters.setCriterio(filters.criterio === 'SEM_MOVIMENTO' ? '' : 'SEM_MOVIMENTO'),
            active: filters.criterio === 'SEM_MOVIMENTO'
          },
          { 
            label: 'Estoque Alto', 
            value: filteredData.filtered.filter((r: any) => r.criterio === 'ESTOQUE_ALTO').length, 
            sub: 'Cob. > 6 Meses', 
            color: '#a855f7',
            onClick: () => setFilters.setCriterio(filters.criterio === 'ESTOQUE_ALTO' ? '' : 'ESTOQUE_ALTO'),
            active: filters.criterio === 'ESTOQUE_ALTO'
          },
          { 
            label: 'Itens OK', 
            value: filteredData.filtered.filter((r: any) => r.criterio === 'OK').length, 
            sub: 'Estoque Saudável', 
            color: '#10b981', 
            onClick: () => setFilters.setCriterio(filters.criterio === 'OK' ? '' : 'OK'),
            active: filters.criterio === 'OK'
          },
        ].map((kpi, idx) => (
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            key={idx} 
            onClick={kpi.onClick}
            className={`bg-brand-card border rounded-xl p-4 relative overflow-hidden group transition-all cursor-pointer hover:border-brand-blue/50 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] shadow-lg shadow-black/20 ${
              kpi.active ? 'border-brand-blue ring-1 ring-brand-blue/30 bg-brand-blue/5' : 'border-brand-border'
            }`}
          >
            <div className={`absolute left-0 top-0 h-full transition-all ${kpi.active ? 'w-1.5' : 'w-1 group-hover:w-1.5'}`} style={{ backgroundColor: kpi.color }} />
            <div className={`text-[10px] font-semibold uppercase tracking-widest mb-1 transition-colors ${kpi.active ? 'text-brand-blue' : 'text-gray-500 group-hover:text-gray-300'}`}>{kpi.label}</div>
            <div className="text-2xl font-bold tracking-tight mb-0.5" style={{ color: kpi.valueColor }}>{kpi.value}</div>
            <div className="text-[9px] text-gray-500 font-mono uppercase flex items-center gap-1">
              {kpi.sub}
              <ArrowUpRight className={`w-2.5 h-2.5 transition-all transform ${kpi.active ? 'opacity-100 translate-x-0.5 -translate-y-0.5' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-6 font-mono flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-brand-blue" />
                Movimentação Mensal (Consolidado)
              </h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={fmtBRLSimple} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                      labelStyle={{ marginBottom: '4px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="#4f7cff" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={28} className="cursor-pointer transition-all hover:fill-opacity-100" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-6 font-mono flex items-center gap-2">
                <LayoutDashboard className="w-3 h-3 text-brand-cyan" />
                Top 10 Grupos <span className="text-[8px] text-gray-600 lowercase">(clique p/ filtrar)</span>
              </h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topGrupos} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} width={80} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 4, 4, 0]} 
                      barSize={18}
                      onClick={(data) => setFilters.setGroup(filters.group === data.name ? '' : data.name)}
                      className="cursor-pointer"
                    >
                      {topGrupos.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          fillOpacity={filters.group === entry.name ? 1 : filters.group ? 0.2 : 0.8}
                          className="transition-all"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>


          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl relative shadow-black/40">
            <div className="p-4 border-b border-brand-border bg-brand-card/50 flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-brand-blue/10 border border-brand-blue/20 px-3 py-1 rounded-full">
                  <div className="h-2 w-2 rounded-full bg-brand-blue animate-pulse" />
                  <span className="text-[10px] font-bold font-mono text-brand-blue uppercase tracking-wider">
                    {filteredData.filtered.length.toLocaleString()} SKUs Catalogados
                  </span>
                </div>
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest hidden sm:block">Filtro Ativo</span>
              </div>
              
              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => setFilters.setCriterio(filters.criterio === 'COMPRAR_COMBO' ? '' : 'COMPRAR_COMBO')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2 border ${
                    filters.criterio === 'COMPRAR_COMBO'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]' 
                    : 'bg-brand-bg border-brand-border text-gray-500 hover:border-gray-600'
                  }`}
                >
                  <ShoppingCart className="w-3 h-3" />
                  Precisa Comprar
                </button>

                <div className="flex bg-brand-bg border border-brand-border rounded-lg p-0.5">
                  {['', 'A', 'B', 'C'].map(abc => (
                    <button
                      key={abc}
                      onClick={() => setFilters.setAbc(abc)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                        filters.abc === abc 
                        ? 'bg-brand-blue text-white' 
                        : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {abc || 'ABC'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[640px] custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0f1218] z-20 shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  <tr>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold w-[40px]">ABC</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold">Item</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold">Filial/Grupo</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold text-center">Saldo</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold text-center">Média/Volume</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold text-center">Cob. (Meses)</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold text-center">Sugestão</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold text-center">Tendência</th>
                    <th className="p-4 border-b border-brand-border text-[9px] uppercase tracking-wider text-gray-500 font-bold text-center w-[120px]">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50">
                  {slice.map((r: any) => {
                    const trend = (r.t4 > r.t3) ? 'up' : (r.t4 < r.t3) ? 'down' : 'stable';
                    const volumePct = (r.total_mov / maxTotalMov) * 100;
                    
                    return (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={`${r.cod}-${r.filial}`} 
                        className="hover:bg-brand-blue/5 transition-colors group cursor-pointer"
                        onClick={() => setSelectedItem(r)}
                      >
                        <td className="p-4">
                          <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${
                            r.curva === 'A' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            r.curva === 'B' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {r.curva}
                          </span>
                        </td>
                        <td className="p-4 min-w-[250px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-[10px] text-brand-blue font-bold tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">
                              #{r.cod}
                            </span>
                            <div 
                              className="text-xs font-semibold text-gray-200 leading-snug line-clamp-2 group-hover:text-white transition-colors" 
                              title={r.desc}
                            >
                              {r.desc}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-[10px] font-mono text-brand-blue uppercase">{r.filial.split(' - ')[0]}</div>
                          <div className="text-[9px] text-gray-600 truncate max-w-[120px] uppercase font-semibold">{r.grupo}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`text-sm font-bold ${r.saldo < 0 ? 'text-red-500' : 'text-gray-100'}`}>
                            {r.saldo.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-gray-600 font-mono">{r.un}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-mono font-bold text-gray-300">{r.media.toFixed(1)}</span>
                            <div className="w-16 h-1 bg-black/40 rounded-full mt-1 overflow-hidden" title={`Total Mov: ${r.total_mov}`}>
                              <div className="h-full bg-brand-cyan" style={{ width: `${Math.min(100, volumePct + 2)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.cobertura === 0 ? 'bg-red-500/20 text-red-500' :
                            r.cobertura <= 0.5 ? 'bg-red-500/20 text-red-500' :
                            r.cobertura <= 1.5 ? 'bg-orange-500/20 text-orange-500' :
                            r.cobertura <= 3.0 ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-green-500/20 text-green-500'
                          }`}>
                            {r.cobertura >= 99 ? '99+' : r.cobertura.toFixed(1)}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`text-sm font-bold ${r.sugestao > 0 ? 'text-orange-400' : 'text-gray-600'}`}>
                            {r.sugestao > 0 ? r.sugestao.toLocaleString() : '—'}
                          </div>
                          {r.sugestao > 0 && <div className="text-[8px] text-gray-500 uppercase font-mono">Sug. 2 meses</div>}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            {trend === 'up' ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : trend === 'down' ? (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            ) : (
                              <div className="w-4 h-0.5 bg-gray-600 rounded-full my-2" />
                            )}
                          </div>
                          <div className="text-[8px] text-gray-600 font-mono mt-0.5">T3 vs T4</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span 
                              className="px-2 py-1 rounded text-[9px] uppercase font-bold flex-1 text-center"
                              style={{ border: `1px solid ${CRIT_COLORS[r.criterio]}33`, color: CRIT_COLORS[r.criterio], backgroundColor: `${CRIT_COLORS[r.criterio]}11` }}
                            >
                              {CRIT_LABELS[r.criterio] || r.criterio}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-brand-border bg-brand-card/50 flex justify-between items-center">
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                Página {page + 1} de {Math.max(1, totalPages)} • {filteredData.filtered.length.toLocaleString()} itens
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-brand-border disabled:opacity-20 hover:border-brand-blue transition-all uppercase font-bold text-[10px]"
                >
                  Anterior
                </button>
                <button 
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-brand-border disabled:opacity-20 hover:border-brand-blue transition-all uppercase font-bold text-[10px]"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-6 font-mono flex items-center gap-2">
            <Users className="w-3 h-3 text-brand-green" />
            Mov. por Filial <span className="text-[8px] text-gray-600 lowercase">(clique p/ filtrar)</span>
          </h3>
          <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
            {data.filiais.map((f: string, idx: number) => {
              const v = filialAgg[f] || 0;
              const pct = totalFilialMov > 0 ? (v / totalFilialMov) * 100 : 0;
              const active = filters.filial === f || !filters.filial;
              
              return (
                <motion.div 
                  whileHover={{ x: 4 }}
                  key={f} 
                  onClick={() => setFilters.setFilial(filters.filial === f ? '' : f)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                    filters.filial === f ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_15px_rgba(79,124,255,0.1)]' : 'bg-brand-bg/40 border-brand-border/50 hover:border-white/20'
                  } ${!active ? 'opacity-30' : 'opacity-100'}`}
                >
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-[10px] uppercase font-bold truncate max-w-[120px] transition-colors ${filters.filial === f ? 'text-brand-blue' : 'text-gray-500'}`} title={f}>
                      {f.split(' - ')[0]}
                    </span>
                    <span className="text-sm font-bold tracking-tight">{v.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] text-gray-600 font-mono">{pct.toFixed(1)}% do mov.</span>
                    <span className="text-[9px] text-gray-600 font-mono">
                      {filteredData.filtered.filter((r: any) => r.filial === f).length} itens
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-brand-card border border-brand-border rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-bg/50">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{selectedItem.cod} — {selectedItem.desc}</h2>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mt-1">
                    {selectedItem.grupo} • {selectedItem.fab}
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">Saldo em Estoque</div>
                    <div className={`text-2xl font-bold ${selectedItem.saldo <= 0 ? 'text-brand-red' : 'text-brand-green'}`}>{selectedItem.saldo.toLocaleString()}</div>
                    <div className="text-[9px] text-gray-600 font-mono mt-1 italic">{selectedItem.filial}</div>
                  </div>
                  <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">Movimentação Anual</div>
                    <div className="text-2xl font-bold text-brand-blue">{selectedItem.total_mov.toLocaleString()}</div>
                    <div className="text-[9px] text-gray-600 font-mono mt-1 italic">Vendas JAN a DEZ</div>
                  </div>
                  <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mb-1">Status Crítico</div>
                    <div className="text-2xl font-bold" style={{ color: CRIT_COLORS[selectedItem.criterio] }}>{CRIT_LABELS[selectedItem.criterio] || selectedItem.criterio}</div>
                    <div className="text-[9px] text-gray-600 font-mono mt-1 italic">Algoritmo de Reposição</div>
                  </div>
                </div>

                <div className="bg-brand-bg p-6 rounded-2xl border border-brand-border mb-8">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-6 text-center">Sazonalidade Mensal (Consolidado)</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData.map((m, i) => ({ 
                        name: m.name, 
                        value: data.inventoryRecords?.filter(r => r.cod === selectedItem.cod).reduce((acc, r) => acc + (r.meses[i] || 0), 0) || 0
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0d0f14' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border">
                        <th className="py-2 pr-4 font-mono text-[9px] uppercase tracking-widest text-gray-600">Filial</th>
                        <th className="py-2 pr-4 text-right font-mono text-[9px] uppercase tracking-widest text-gray-600 font-bold">Saldo</th>
                        <th className="py-2 text-right font-mono text-[9px] uppercase tracking-widest text-gray-600 font-bold">Total Mov.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                      {data.inventoryRecords?.filter(r => r.cod === selectedItem.cod).map((r, i) => (
                        <tr key={i}>
                          <td className="py-3 pr-4 text-gray-400 font-medium">{r.filial}</td>
                          <td className={`py-3 pr-4 text-right font-mono font-bold ${r.saldo <= 0 ? 'text-brand-red' : 'text-brand-green'}`}>{r.saldo}</td>
                          <td className="py-3 text-right font-mono font-bold text-brand-cyan">{r.total_mov}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function App() {
  const [screen, setScreen] = useState<Screen>('selection');
  const [appMode, setAppMode] = useState<AppMode>('purchases');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  
  const [filterFilial, setFilterFilial] = useState<string>('');
  const [filterPartner, setFilterPartner] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCriterio, setFilterCriterio] = useState<string>('');
  const [filterABC, setFilterABC] = useState<string>('');
  const [selectedPartnerDetails, setSelectedPartnerDetails] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const steps = [
    'Lendo arquivo com SheetJS',
    'Detectando estrutura de ERP',
    'Filtrando transações NFE',
    'Agregando dados financeiros',
    'Finalizando visualizações'
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    
    if ('dataTransfer' in e) {
      // DragEvent
      e.preventDefault();
      file = e.dataTransfer?.files?.[0];
    } else {
      // ChangeEvent
      file = (e.target as HTMLInputElement).files?.[0];
    }

    if (!file) return;

    setScreen('processing');
    setProcessingStep(0);

    try {
      // Simulate steps for UI polish
      for (let i = 0; i < steps.length; i++) {
        setProcessingStep(i);
        await new Promise(r => setTimeout(r, 400));
      }

      const result = await processFile(file, appMode);
      setData(result);
      setScreen('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setScreen('error');
    }
  };

  const dashboardConfig = useMemo(() => {
    if (appMode === 'purchases') {
      return {
        title: 'Dashboard de Compras',
        partnerLabel: 'Fornecedor',
        partnersLabel: 'Fornecedores',
        actionLabel: 'Compras',
        icon: TrendingDown,
        color: 'text-brand-blue',
        barColor: 'bg-brand-blue'
      };
    }
    if (appMode === 'missing_items') {
      return {
        title: 'Dashboard de Itens em Falta',
        partnerLabel: 'Fornecedor',
        partnersLabel: 'Fornecedores',
        actionLabel: 'Reposição',
        icon: AlertCircle,
        color: 'text-brand-yellow',
        barColor: 'bg-brand-yellow'
      };
    }
    return {
      title: 'Dashboard de Vendas',
      partnerLabel: 'Cliente',
      partnersLabel: 'Clientes',
      actionLabel: 'Vendas',
      icon: TrendingUp,
      color: 'text-brand-green',
      barColor: 'bg-brand-green'
    };
  }, [appMode]);

  const filteredData = useMemo(() => {
    if (!data) return null;

    if (appMode === 'missing_items' && data.inventoryRecords) {
      let filtered = data.inventoryRecords;
      if (filterFilial) filtered = filtered.filter(r => r.filial === filterFilial);
      if (filterPartner) filtered = filtered.filter(r => r.grupo === filterPartner);
      if (filterCriterio) {
        if (filterCriterio === 'COMPRAR_COMBO') {
          filtered = filtered.filter(r => 
            ['URGENTE', 'COMPRAR_JA', 'COMPRAR_BREVE'].includes(r.criterio) && 
            r.total_mov > 0 && 
            (r.saldo_inicial !== 0) // Only exclude if explicitly 0. If null/undefined, keep it.
          );
        } else if (filterCriterio === 'SEM_MOVIMENTO') {
          filtered = filtered.filter(r => r.total_mov === 0 && r.saldo > 0);
        } else {
          filtered = filtered.filter(r => r.criterio === filterCriterio);
        }
      }
      if (filterABC) filtered = filtered.filter(r => r.curva === filterABC);
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = filtered.filter(r => 
          r.cod.toLowerCase().includes(lower) || 
          r.desc.toLowerCase().includes(lower)
        );
      }

      const counts = {
        URGENTE: filtered.filter(r => r.criterio === 'URGENTE').length,
        COMPRAR_JA: filtered.filter(r => r.criterio === 'COMPRAR_JA').length,
        COMPRAR_BREVE: filtered.filter(r => r.criterio === 'COMPRAR_BREVE').length,
        OK: filtered.filter(r => r.criterio === 'OK').length,
        ESTOQUE_ALTO: filtered.filter(r => r.criterio === 'ESTOQUE_ALTO').length,
        SEM_GIRO: filtered.filter(r => r.criterio === 'SEM_GIRO').length,
        SEM_MOVIMENTO: filtered.filter(r => r.criterio === 'SEM_MOVIMENTO').length,
      };

      const abcCounts = {
        A: filtered.filter(r => r.curva === 'A').length,
        B: filtered.filter(r => r.curva === 'B').length,
        C: filtered.filter(r => r.curva === 'C').length,
      };

      const abcMov = {
        A: filtered.filter(r => r.curva === 'A').reduce((acc, r) => acc + r.total_mov, 0),
        B: filtered.filter(r => r.curva === 'B').reduce((acc, r) => acc + r.total_mov, 0),
        C: filtered.filter(r => r.curva === 'C').reduce((acc, r) => acc + r.total_mov, 0),
      };

      const critDistribution = Object.entries(counts).map(([name, value]) => ({ name, value }));

      const abcData = [
        { name: 'A', items: abcCounts.A, mov: abcMov.A },
        { name: 'B', items: abcCounts.B, mov: abcMov.B },
        { name: 'C', items: abcCounts.C, mov: abcMov.C },
      ];

      return {
        inventory: {
          filtered,
          counts,
          critDistribution,
          abcData
        }
      };
    }

    let filteredRecords = data.records || [];
    
    if (filterFilial) {
      filteredRecords = filteredRecords.filter(r => r.filial === filterFilial);
    }
    if (filterPartner) {
      filteredRecords = filteredRecords.filter(r => r.parceiro === filterPartner);
    }

    const total = filteredRecords.reduce((acc, r) => acc + r.total, 0);
    const nfs = new Set(filteredRecords.map(r => r.nf)).size;
    const partners = new Set(filteredRecords.map(r => r.parceiro)).size;
    const items = new Set(filteredRecords.map(r => r.codItem)).size;

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
      value: filteredRecords.filter(r => r.mes === i + 1).reduce((acc, r) => acc + r.total, 0)
    }));

    const partnerAgg: Record<string, number> = {};
    filteredRecords.forEach(r => {
      partnerAgg[r.parceiro] = (partnerAgg[r.parceiro] || 0) + r.total;
    });
    const sortedPartners = Object.entries(partnerAgg)
      .sort((a, b) => b[1] - a[1]);
    
    const topPartners = sortedPartners.slice(0, 15).map(([name, value]) => ({ name, value }));

    // Pareto calc
    const totalForPareto = sortedPartners.reduce((acc, [_, v]) => acc + v, 0);
    let runningTotal = 0;
    const paretoData = sortedPartners.slice(0, 15).map(([name, value], index) => {
      runningTotal += value;
      return {
        id: index + 1,
        name: name.slice(0, 15) + '...',
        fullName: name,
        value,
        percent: Math.round((runningTotal / totalForPareto) * 100)
      };
    });

    const availablePartners = [...new Set(filteredRecords.map(r => r.parceiro))].sort();

    // MoM comparison for latest month
    const latestMonth = data.latestMonth || 1;
    let deltas: { deltaTotal?: number; deltaPartners?: number; deltaNFs?: number } = {};

    if (appMode === 'sales') {
      const prevMonth = latestMonth - 1;
      const latestTotal = filteredRecords.filter(r => r.mes === latestMonth).reduce((acc, r) => acc + r.total, 0);
      const prevTotal = filteredRecords.filter(r => r.mes === prevMonth).reduce((acc, r) => acc + r.total, 0);
      deltas.deltaTotal = prevTotal > 0 ? ((latestTotal - prevTotal) / prevTotal) * 100 : 0;

      const latestPartners = new Set(filteredRecords.filter(r => r.mes === latestMonth).map(r => r.parceiro)).size;
      const prevPartners = new Set(filteredRecords.filter(r => r.mes === prevMonth).map(r => r.parceiro)).size;
      deltas.deltaPartners = prevPartners > 0 ? latestPartners - prevPartners : 0;

      const latestNFs = new Set(filteredRecords.filter(r => r.mes === latestMonth).map(r => r.nf)).size;
      const prevNFs = new Set(filteredRecords.filter(r => r.mes === prevMonth).map(r => r.nf)).size;
      deltas.deltaNFs = prevNFs > 0 ? latestNFs - prevNFs : 0;
    }


    return {
      kpis: { 
        total, nfs, partners, items,
        ...deltas
      },
      latestMonthLabel: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][latestMonth - 1],
      monthly,
      topPartners,
      paretoData,
      availablePartners
    };
  }, [data, appMode, filterFilial, filterPartner, filterCriterio, filterABC, searchTerm]);

  return (
    <div className="min-h-screen bg-brand-bg text-gray-200">
      <AnimatePresence mode="wait">
        {screen === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-brand-blue/20">
              <LayoutDashboard className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Selecione o Dashboard</h1>
            <p className="text-gray-500 max-w-md mb-12">
              Escolha qual fluxo de dados deseja analisar. O sistema adaptará os indicadores para o contexto selecionado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-5xl">
              <button 
                onClick={() => { setAppMode('purchases'); setScreen('upload'); }}
                className="group relative p-8 bg-brand-card border border-brand-border rounded-3xl hover:border-brand-blue transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShoppingCart className="w-24 h-24" />
                </div>
                <div className="w-12 h-12 bg-brand-blue/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingDown className="text-brand-blue w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Dashboard Compras</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Análise de fornecedores, custos e mix de produtos.
                </p>
                <div className="mt-8 flex items-center text-xs font-bold text-brand-blue uppercase tracking-widest gap-2">
                  Acessar <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              <button 
                onClick={() => { setAppMode('missing_items'); setScreen('upload'); }}
                className="group relative p-8 bg-brand-card border border-brand-border rounded-3xl hover:border-brand-yellow transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <AlertCircle className="w-24 h-24" />
                </div>
                <div className="w-12 h-12 bg-brand-yellow/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <AlertCircle className="text-brand-yellow w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Itens em Falta</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Identificação crítica de ruptura de estoque e reposição.
                </p>
                <div className="mt-8 flex items-center text-xs font-bold text-brand-yellow uppercase tracking-widest gap-2">
                  Acessar <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              <button 
                onClick={() => { setAppMode('sales'); setScreen('upload'); }}
                className="group relative p-8 bg-brand-card border border-brand-border rounded-3xl hover:border-brand-green transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <DollarSign className="w-24 h-24" />
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-brand-green w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Dashboard Vendas</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Análise de clientes, faturamento e mix de vendas.
                </p>
                <div className="mt-8 flex items-center text-xs font-bold text-brand-green uppercase tracking-widest gap-2">
                  Acessar <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className={`w-16 h-16 ${dashboardConfig.barColor} rounded-2xl flex items-center justify-center mb-6 shadow-xl`}>
              <dashboardConfig.icon className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{dashboardConfig.title}</h1>
            <p className="text-gray-500 max-w-md mb-8">
              Transforme planilhas brutas de ERP em insights estratégicos. 
              Suporte para reconciliação automática de filiais e {dashboardConfig.partnersLabel.toLowerCase()}.
            </p>
            
            <div 
              className="w-full max-w-lg border-2 border-dashed border-brand-border rounded-xl bg-brand-card p-12 cursor-pointer hover:border-dashboard-color/50 hover:bg-white/5 transition-all group relative"
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileUpload}
            >
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
              />
              <Upload className="mx-auto w-10 h-10 text-gray-600 group-hover:text-brand-blue transition-colors mb-4" />
              <h3 className="text-lg font-medium mb-1">Arraste sua planilha aqui</h3>
              <p className="text-sm text-gray-500">Formato .xlsx, .xls ou .csv</p>
            </div>

            <button 
              onClick={() => setScreen('selection')}
              className="mt-8 text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-widest flex items-center gap-2"
            >
              <RefreshCcw className="w-3 h-3" /> Alterar Tipo de Dashboard
            </button>
          </motion.div>
        )}

        {screen === 'processing' && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col items-center justify-center p-6"
          >
            <div className="w-12 h-12 border-4 border-brand-card border-t-brand-blue rounded-full animate-spin mb-8" />
            <h2 className="text-xl font-semibold mb-6">Processando dados financeiros...</h2>
            <div className="w-full max-w-sm space-y-2">
              {steps.map((step, idx) => (
                <div 
                  key={step} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    idx === processingStep 
                      ? 'border-brand-blue bg-brand-blue/5 text-gray-100' 
                      : idx < processingStep 
                        ? 'border-brand-green/20 text-brand-green' 
                        : 'border-brand-border text-gray-600'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    idx === processingStep ? 'bg-brand-blue animate-pulse shadow-[0_0_8px_#4f7cff]' : idx < processingStep ? 'bg-brand-green' : 'bg-gray-700'
                  }`} />
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {screen === 'error' && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <AlertCircle className="w-16 h-16 text-brand-red mb-4" />
            <h2 className="text-2xl font-bold mb-2">Erro ao processar planilha</h2>
            <p className="text-gray-400 mb-8 max-w-md">{error}</p>
            <button 
              onClick={() => setScreen('upload')}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/80 transition-colors flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </motion.div>
        )}

        {screen === 'dashboard' && data && filteredData && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-screen"
          >
            {/* Header / Filter Bar */}
            <header className="bg-brand-card border-b border-brand-border sticky top-0 z-50 p-4">
              <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${dashboardConfig.barColor} rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20`}>
                    <dashboardConfig.icon className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm tracking-tight">{dashboardConfig.title.toUpperCase()}</h2>
                    <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-brand-green rounded-full"></span>
                      {data.filename} • {data.rowCount.toLocaleString()} REGISTROS
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {appMode === 'missing_items' ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-gray-500 ml-1">Grupo</label>
                        <select 
                          className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-brand-blue outline-none transition-colors min-w-[140px]"
                          value={filterPartner}
                          onChange={e => setFilterPartner(e.target.value)}
                        >
                          <option value="">Todos os Grupos</option>
                          {data.groups?.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-gray-500 ml-1">Critério</label>
                        <select 
                          className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-brand-blue outline-none transition-colors min-w-[140px]"
                          value={filterCriterio}
                          onChange={e => setFilterCriterio(e.target.value)}
                        >
                          <option value="">Todos os Critérios</option>
                          <option value="COMPRAR_COMBO">Precisa Comprar ✨</option>
                          <option value="URGENTE">Urgente</option>
                          <option value="COMPRAR_JA">Comprar Já</option>
                          <option value="COMPRAR_BREVE">Comprar em Breve</option>
                          <option value="OK">OK</option>
                          <option value="ESTOQUE_ALTO">Estoque Alto</option>
                          <option value="SEM_GIRO">Sem Giro</option>
                          <option value="SEM_MOVIMENTO">Sem Movimento</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-gray-500 ml-1">Curva ABC</label>
                        <select 
                          className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-brand-blue outline-none transition-colors min-w-[80px]"
                          value={filterABC}
                          onChange={e => setFilterABC(e.target.value)}
                        >
                          <option value="">Todas</option>
                          <option value="A">Curva A</option>
                          <option value="B">Curva B</option>
                          <option value="C">Curva C</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-widest text-gray-500 ml-1">Buscar Item</label>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Cód. ou Descrição..."
                            className="bg-brand-bg border border-brand-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 focus:border-brand-blue outline-none transition-colors w-[180px]"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-widest text-gray-500 ml-1">{dashboardConfig.partnerLabel}</label>
                      <select 
                        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-brand-blue outline-none transition-colors max-w-[200px]"
                        value={filterPartner}
                        onChange={e => setFilterPartner(e.target.value)}
                      >
                        <option value="">Todos os {dashboardConfig.partnersLabel}</option>
                        {filteredData.availablePartners?.map(p => <option key={p} value={p}>{p.length > 30 ? p.slice(0, 28) + '...' : p}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex items-end h-full">
                    <button 
                      onClick={() => { 
                        setFilterFilial(''); 
                        setFilterPartner(''); 
                        setSearchTerm('');
                        setFilterCriterio('');
                        setFilterABC('');
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                      title="Limpar Filtros"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={toggleFullScreen}
                      className="p-1.5 text-gray-500 hover:text-brand-blue transition-colors"
                      title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => setScreen('selection')}
                      className="ml-2 px-3 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs hover:border-brand-blue transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Novo Layout
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <main className="p-6 max-w-[1600px] mx-auto w-full flex-1 space-y-6">
              {appMode === 'missing_items' ? (
                <InventoryDashboardView 
                  data={data} 
                  filteredData={filteredData.inventory!} 
                  filters={{
                    filial: filterFilial,
                    group: filterPartner,
                    criterio: filterCriterio,
                    search: searchTerm,
                    abc: filterABC
                  }}
                  setFilters={{
                    setFilial: setFilterFilial,
                    setGroup: setFilterPartner,
                    setCriterio: setFilterCriterio,
                    setSearch: setSearchTerm,
                    setAbc: setFilterABC
                  }}
                />
              ) : (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { 
                        label: `Total de ${dashboardConfig.actionLabel}`, 
                        value: formatCurrency(filteredData.kpis.total), 
                        sub: 'Período completo', 
                        icon: FileSpreadsheet, 
                        color: dashboardConfig.color, 
                        bar: dashboardConfig.barColor,
                        delta: filteredData.kpis.deltaTotal,
                        deltaSuffix: '% MoM'
                      },
                      { 
                        label: dashboardConfig.partnersLabel, 
                        value: filteredData.kpis.partners, 
                        sub: 'Parceiros ativos', 
                        icon: Users, 
                        color: 'text-brand-green', 
                        bar: 'bg-brand-green',
                        delta: filteredData.kpis.deltaPartners,
                        deltaSuffix: ' novos'
                      },
                      { 
                        label: 'Notas Fiscais', 
                        value: filteredData.kpis.nfs, 
                        sub: 'Títulos emitidos', 
                        icon: ClipboardList, 
                        color: 'text-brand-yellow', 
                        bar: 'bg-brand-yellow',
                        delta: filteredData.kpis.deltaNFs,
                        deltaSuffix: ' canais'
                      },
                      { label: 'SKUs Únicos', value: filteredData.kpis.items, sub: 'Códigos de material', icon: Package, color: 'text-brand-purple', bar: 'bg-brand-purple' },
                    ].map((kpi, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        key={kpi.label} 
                        className="bg-brand-card border border-brand-border rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-colors"
                      >
                        <div className={`absolute left-0 top-0 w-1 h-full ${kpi.bar}`} />
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{kpi.label}</span>
                          <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-80`} />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                          {kpi.delta !== undefined && kpi.delta !== 0 && (
                            <div className={`flex items-center text-[10px] font-bold mb-1 ${kpi.delta > 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                              {kpi.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(kpi.delta).toFixed(idx === 0 ? 1 : 0)}{kpi.deltaSuffix}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-600 font-mono mt-1 uppercase">{kpi.sub}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Main Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 bg-brand-card border border-brand-border rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Evolução Mensal de {dashboardConfig.actionLabel}</h3>
                        <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px] font-mono text-gray-500">
                          {appMode === 'sales' 
                            ? `Variação MoM: ${filteredData.latestMonthLabel} vs ${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][(data.latestMonth - 2 + 12) % 12]}`
                            : 'Consolidado Anual'
                          }
                        </span>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredData.monthly}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'JetBrains Mono' }} 
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'JetBrains Mono' }}
                              tickFormatter={(v) => `R$ ${v > 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                              itemStyle={{ fontSize: '12px' }}
                              formatter={(v: number) => [formatFullCurrency(v), 'Total']}
                            />
                            <Bar 
                              dataKey="value" 
                              fill={appMode === 'purchases' ? '#4f7cff' : appMode === 'missing_items' ? '#f59e0b' : '#38e2a0'} 
                              radius={[4, 4, 0, 0]} 
                              barSize={32}
                              animationDuration={1500}
                            >
                              {filteredData.monthly.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fillOpacity={0.7} className="hover:fill-opacity-100 transition-all cursor-pointer" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="lg:col-span-4 bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Distribuição por Filial</h3>
                      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {data.filiais.map((f, idx) => {
                          const value = data.filialTotals?.[f] || 0;
                          const totalGeral = data.kpis?.totalGeral || 1;
                          const percentage = (value / totalGeral) * 100;
                          const colors = ['bg-brand-blue', 'bg-brand-green', 'bg-brand-yellow', 'bg-brand-purple', 'bg-brand-red'];
                          const active = filterFilial === f || !filterFilial;
                          
                          return (
                            <div 
                              key={f} 
                              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                filterFilial === f ? 'border-brand-blue bg-brand-blue/5' : 'border-brand-border hover:bg-white/5'
                              } ${!active ? 'opacity-40' : ''}`}
                              onClick={() => setFilterFilial(filterFilial === f ? '' : f)}
                            >
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-medium uppercase text-gray-500">{f}</span>
                                <span className="text-sm font-bold">{formatCurrency(value)}</span>
                              </div>
                              <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className={`h-full ${colors[idx % colors.length]}`} 
                                />
                              </div>
                              <div className="flex justify-between mt-1.5">
                                <span className="text-[9px] text-gray-600 font-mono">{percentage.toFixed(1)}% DO TOTAL</span>
                                <span className="text-[9px] text-gray-600 font-mono">{data.records?.filter(r => r.filial === f).length} OCORRÊNCIAS</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                          Top 15 {dashboardConfig.partnersLabel} {filterFilial ? `— ${filterFilial}` : ''}
                        </h3>
                        <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px] font-mono text-gray-500">Ranking por Valor</span>
                      </div>
                      <div className="space-y-1">
                        {filteredData.topPartners.map((p: any, idx: number) => (
                          <div 
                            key={p.name} 
                            className="flex items-center gap-3 p-1.5 rounded hover:bg-white/5 group cursor-pointer"
                            onClick={() => setSelectedPartnerDetails(p.name)}
                          >
                            <span className="w-6 text-[10px] font-mono text-gray-600 text-right">{idx + 1}</span>
                            <div className="flex-1 overflow-hidden">
                              <div className="text-[11px] truncate">{p.name}</div>
                              <div className="h-1 w-full bg-brand-bg rounded-full mt-1">
                                <div 
                                  className={`h-full ${appMode === 'purchases' ? 'bg-brand-blue' : appMode === 'missing_items' ? 'bg-brand-yellow' : 'bg-brand-green'} opacity-30 group-hover:opacity-100 transition-all rounded-full`} 
                                  style={{ width: `${(p.value / filteredData.topPartners[0].value) * 100}%` }}
                                />
                              </div>
                            </div>
                            <span className="w-24 text-[10px] font-mono text-right text-gray-400">{formatCurrency(p.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Análise de Pareto (Concentração)</h3>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={filteredData.paretoData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} />
                            <YAxis 
                              yAxisId="left"
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fill: '#6b7280' }}
                              tickFormatter={(v) => fmtBRLSimple(v)}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fill: '#ff6b6b' }}
                              tickFormatter={(v) => `${v}%`}
                              domain={[0, 100]}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                              formatter={(v: any, name: string) => [name === 'percent' ? v + '%' : formatFullCurrency(v), name === 'percent' ? 'Acumulado' : 'Valor']}
                            />
                            <Bar 
                              yAxisId="left" 
                              dataKey="value" 
                              fill={appMode === 'purchases' ? '#4f7cff' : appMode === 'missing_items' ? '#f59e0b' : '#38e2a0'} 
                              fillOpacity={0.2} 
                              radius={[2, 2, 0, 0]} 
                              barSize={20}
                              onClick={(data) => setSelectedPartnerDetails(data.fullName)} 
                              className="cursor-pointer"
                            />
                            <Line yAxisId="right" type="monotone" dataKey="percent" stroke="#ff6b6b" strokeWidth={2} dot={{ r: 3, fill: '#ff6b6b' }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                        <div className="mt-4 p-3 bg-brand-bg border border-brand-border rounded-lg text-[10px] text-gray-500 text-center uppercase tracking-wider">
                          Os top 15 fornecedores representam {filteredData.paretoData[filteredData.paretoData.length - 1]?.percent}% das {appMode === 'purchases' ? 'compras' : 'vendas'} totais
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </main>

            <footer className="bg-brand-card border-t border-brand-border p-4 text-[10px] text-gray-600 font-mono">
              <div className="max-w-[1600px] mx-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-brand-green rounded-full shadow-[0_0_4px_#38e2a0]" />
                  <span>SISTEMA ATIVO</span>
                </div>
                <span>•</span>
                <span className="text-gray-500 uppercase">Stack: React + Tailwind + Recharts + SheetJS</span>
                <span className="ml-auto">© 2024 AI STUDIO ANALYTICS</span>
              </div>
            </footer>

            {/* PartnerDetailsModal Call */}
            <AnimatePresence>
              {selectedPartnerDetails && (
                <PartnerDetailsModal 
                  partnerName={selectedPartnerDetails} 
                  filialName={filterFilial || 'Todas as Filiais'}
                  mode={appMode}
                  records={(data.records || []).filter(r => 
                    r.parceiro === selectedPartnerDetails && 
                    (filterFilial ? r.filial === filterFilial : true)
                  )}
                  onClose={() => setSelectedPartnerDetails(null)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PartnerDetailsModal({ partnerName, filialName, mode, records, onClose }: { partnerName: string, filialName: string, mode: AppMode, records: PurchaseRecord[], onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const labels = mode === 'purchases' ? {
    partner: 'Fornecedor',
    action: 'Negociado'
  } : mode === 'missing_items' ? {
    partner: 'Fornecedor',
    action: 'Reposição'
  } : {
    partner: 'Cliente',
    action: 'Faturado'
  };

  const stats = useMemo(() => {
    const total = records.reduce((acc, r) => acc + r.total, 0);
    const nfs = [...new Set(records.map(r => r.nf))];
    const items = [...new Set(records.map(r => r.itemDesc))];
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
      value: records.filter(r => r.mes === i + 1).reduce((acc, r) => acc + r.total, 0)
    }));

    return { total, nfs, items, monthly };
  }, [records]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-4xl bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-brand-border flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-xl flex items-center justify-center">
              <Users className="text-brand-blue w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{partnerName}</h2>
              <p className="text-[10px] text-gray-400 font-mono uppercase flex items-center gap-2">
                <span>Detalhamento Individual ({labels.partner})</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span className="text-brand-blue">{filialName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-brand-bg p-4 rounded-xl border border-brand-border">
              <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">Total {labels.action}</div>
              <div className={`text-xl font-bold ${mode === 'purchases' ? 'text-brand-blue' : 'text-brand-green'}`}>{formatFullCurrency(stats.total)}</div>
            </div>
            <div className="bg-brand-bg p-4 rounded-xl border border-brand-border">
              <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">Freq. de Faturamento</div>
              <div className="text-xl font-bold text-brand-green">{stats.nfs.length} Notas Fiscais</div>
            </div>
            <div className="bg-brand-bg p-4 rounded-xl border border-brand-border">
              <div className="text-[10px] text-gray-500 uppercase font-mono mb-1">Mix de Produtos</div>
              <div className="text-xl font-bold text-brand-yellow">{stats.items.length} SKUs Únicos</div>
            </div>
          </div>

          {/* Historical Chart */}
          <div className="bg-brand-bg p-5 rounded-xl border border-brand-border">
            <h3 className="text-[10px] text-gray-500 uppercase font-mono mb-6">Evolução Histórica Mensal</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => fmtBRLSimple(v)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                    formatter={(v: number) => [formatFullCurrency(v), 'Total']}
                  />
                  <Bar dataKey="value" fill={mode === 'purchases' ? '#4f7cff' : mode === 'missing_items' ? '#f59e0b' : '#38e2a0'} radius={[4, 4, 0, 0]} barSize={32} fillOpacity={0.6} />
                  <Line type="monotone" dataKey="value" stroke={mode === 'purchases' ? '#4f7cff' : mode === 'missing_items' ? '#f59e0b' : '#38e2a0'} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Records Table */}
          <div>
            <h3 className="text-[10px] text-gray-500 uppercase font-mono mb-4">Relatário de Operações (NFs)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="text-gray-500 bg-brand-bg/50">
                  <tr>
                    <th className="px-3 py-2 font-medium border-b border-brand-border">NF</th>
                    <th className="px-3 py-2 font-medium border-b border-brand-border">Mês</th>
                    <th className="px-3 py-2 font-medium border-b border-brand-border">Item</th>
                    <th className="px-3 py-2 font-medium border-b border-brand-border">Qtde</th>
                    <th className="px-3 py-2 font-medium border-b border-brand-border">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 font-mono text-brand-blue">{r.nf}</td>
                      <td className="px-3 py-2 text-gray-400">{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][r.mes - 1]}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={r.itemDesc}>{r.itemDesc}</td>
                      <td className="px-3 py-2">{r.qtde} {r.un}</td>
                      <td className="px-3 py-2 font-semibold">{formatFullCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 bg-brand-bg/50 border-t border-brand-border text-center">
          <button 
            onClick={() => {
              // Logic to filter the whole dashboard by this partner could go here
              onClose();
            }}
            className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            Fechar Detalhamento
          </button>
        </div>
      </motion.div>
    </div>
  );
}
