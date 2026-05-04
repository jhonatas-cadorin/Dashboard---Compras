/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
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
  X
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
import { DashboardData, PurchaseRecord } from './types';
import { processFile, formatCurrency, formatFullCurrency } from './utils/processFile';

type Screen = 'upload' | 'processing' | 'dashboard' | 'error';

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  
  const [filterFilial, setFilterFilial] = useState<string>('');
  const [filterPartner, setFilterPartner] = useState<string>('');

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

      const result = await processFile(file);
      setData(result);
      setScreen('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setScreen('error');
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return null;
    let filteredRecords = data.records;
    
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

    return {
      kpis: { total, nfs, partners, items },
      monthly,
      topPartners,
      paretoData
    };
  }, [data, filterFilial, filterPartner]);

  return (
    <div className="min-h-screen bg-brand-bg text-gray-200">
      <AnimatePresence mode="wait">
        {screen === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-brand-blue/20">
              <BarChart3 className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard de Compras</h1>
            <p className="text-gray-500 max-w-md mb-8">
              Transforme planilhas brutas de ERP em insights estratégicos. 
              Suporte para reconciliação automática de filiais e parceiros.
            </p>
            
            <div 
              className="w-full max-w-lg border-2 border-dashed border-brand-border rounded-xl bg-brand-card p-12 cursor-pointer hover:border-brand-blue/50 hover:bg-brand-blue/5 transition-all group relative"
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

            <div className="flex gap-2 mt-8">
              {['Python', 'Streamlit', 'Pandas', 'Plotly', 'ERP'].map(tech => (
                <span key={tech} className="px-3 py-1 bg-brand-card border border-brand-border rounded-full text-[10px] uppercase tracking-wider font-mono text-gray-500">
                  {tech}
                </span>
              ))}
            </div>
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
                  <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20">
                    <LayoutDashboard className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm tracking-tight">COOP. CAFEICULTORES</h2>
                    <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-brand-green rounded-full"></span>
                      {data.filename} • {data.rowCount.toLocaleString()} REGISTROS
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-widest text-gray-500 ml-1">Filial</label>
                    <select 
                      className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-brand-blue outline-none transition-colors min-w-[140px]"
                      value={filterFilial}
                      onChange={e => { setFilterFilial(e.target.value); setFilterPartner(''); }}
                    >
                      <option value="">Todas as Filiais</option>
                      {data.filiais.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-widest text-gray-500 ml-1">Fornecedor</label>
                    <select 
                      className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:border-brand-blue outline-none transition-colors max-w-[200px]"
                      value={filterPartner}
                      onChange={e => setFilterPartner(e.target.value)}
                    >
                      <option value="">Todos os Parceiros</option>
                      {data.partners.map(p => <option key={p} value={p}>{p.length > 30 ? p.slice(0, 28) + '...' : p}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end h-full">
                    <button 
                      onClick={() => { setFilterFilial(''); setFilterPartner(''); }}
                      className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                      title="Limpar Filtros"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setScreen('upload')}
                      className="ml-2 px-3 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs hover:border-brand-blue transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Nova Planilha
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <main className="p-6 max-w-[1600px] mx-auto w-full flex-1 space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total de Compras', value: formatCurrency(filteredData.kpis.total), sub: 'Período completo', icon: FileSpreadsheet, color: 'text-brand-blue', bar: 'bg-brand-blue' },
                  { label: 'Fornecedores', value: filteredData.kpis.partners, sub: 'Parceiros ativos', icon: Users, color: 'text-brand-green', bar: 'bg-brand-green' },
                  { label: 'Notas Fiscais', value: filteredData.kpis.nfs, sub: 'Títulos emitidos', icon: ClipboardList, color: 'text-brand-yellow', bar: 'bg-brand-yellow' },
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
                    <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                    <div className="text-[10px] text-gray-600 font-mono mt-1 uppercase">{kpi.sub}</div>
                  </motion.div>
                ))}
              </div>

              {/* Main Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-brand-card border border-brand-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Evolução Mensal de Compras</h3>
                    <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px] font-mono text-gray-500">2024-2025</span>
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
                          contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '12px' }}
                          formatter={(v: number) => [formatFullCurrency(v), 'Total']}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#4f7cff" 
                          radius={[4, 4, 0, 0]} 
                          barSize={32}
                          animationDuration={1500}
                        >
                          {filteredData.monthly.map((entry, index) => (
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
                      const value = data.filialTotals[f] || 0;
                      const percentage = (value / data.kpis.totalGeral) * 100;
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
                            <span className="text-[9px] text-gray-600 font-mono">{data.records.filter(r => r.filial === f).length} OCORRÊNCIAS</span>
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
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Top 15 Fornecedores</h3>
                    <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px] font-mono text-gray-500">Ranking por Valor</span>
                  </div>
                  <div className="space-y-1">
                    {filteredData.topPartners.map((p, idx) => (
                      <div key={p.name} className="flex items-center gap-3 p-1.5 rounded hover:bg-white/5 group">
                        <span className="w-6 text-[10px] font-mono text-gray-600 text-right">{idx + 1}</span>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-[11px] truncate">{p.name}</div>
                          <div className="h-1 w-full bg-brand-bg rounded-full mt-1">
                            <div 
                              className="h-full bg-brand-blue opacity-30 group-hover:opacity-100 transition-all rounded-full" 
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
                          contentStyle={{ backgroundColor: '#13161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          formatter={(v: any, name: string) => [name === 'percent' ? v + '%' : formatFullCurrency(v), name === 'percent' ? 'Acumulado' : 'Valor']}
                        />
                        <Bar yAxisId="left" dataKey="value" fill="#4f7cff" fillOpacity={0.2} radius={[2, 2, 0, 0]} barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="percent" stroke="#ff6b6b" strokeWidth={2} dot={{ r: 3, fill: '#ff6b6b' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="mt-4 p-3 bg-brand-bg border border-brand-border rounded-lg text-[10px] text-gray-500 text-center uppercase tracking-wider">
                      Os top 15 fornecedores representam {filteredData.paretoData[filteredData.paretoData.length - 1]?.percent}% das compras totais
                    </div>
                  </div>
                </div>
              </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function fmtBRLSimple(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toString();
}
