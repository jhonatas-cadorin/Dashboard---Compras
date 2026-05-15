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
  History,
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
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Box,
  Hash,
  FilePlus,
  CheckCircle2,
  EyeOff,
  Sparkles,
  Tag,
  ChevronLeft,
  Zap,
  ShieldCheck,
  BrainCircuit,
  AlertTriangle,
  Workflow,
  Terminal,
  FileDown,
  Share2,
  ArrowRight,
  Eye,
  Quote,
  Activity,
  ChevronDown,
  Plus,
  Cpu,
  BarChart2,
  PackageSearch,
  Sun,
  Moon,
  MapPin,
  RefreshCw,
  Ghost,
  Archive,
  Layers,
  Network,
  LayoutGrid,
  TableProperties,
  Search,
  ArrowRightLeft,
  Building2,
  PieChart,
  Settings,
  Printer,
  Trash2,
  Factory,
  Mail,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  ComposedChart,
  AreaChart,
  Area
} from 'recharts';
import { DashboardData, PurchaseRecord, AppMode } from './types';
import { processFile, formatCurrency, formatFullCurrency } from './utils/processFile';

// Utility to clean filial names according to user preference
const cleanFilialName = (name: string) => {
  if (!name) return '';
  return name
    .replace(/COOPERATIVA DE CAFEICULTORES E AGROPECUARISTAS/gi, '')
    .replace(/REDE COOXUPÉ\s*-\s*/gi, '')
    .replace(/COOXUPE\s*-\s*/gi, '')
    .split('-')[0] // Get initial part
    .trim()
    .toUpperCase();
};

type Screen = 'selection' | 'upload' | 'processing' | 'dashboard' | 'error';

function fmtBRLSimple(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toString();
}


function ItemDetailModal({ 
  item, 
  data, 
  onClose,
  theme
}: { 
  item: any, 
  data: DashboardData, 
  onClose: () => void,
  theme: 'light' | 'dark'
}) {
  const networkOptions = useMemo(() => (data.inventoryRecords || [])
    .filter(r => r.cod === item.cod && r.filial.split(' - ')[0] !== item.filial.split(' - ')[0] && r.saldoTransferivel > 0)
    .sort((a, b) => b.saldoTransferivel - a.saldoTransferivel), [data.inventoryRecords, item]);

  const chartColors = useMemo(() => ({
    stroke: "#3b82f6",
    grid: theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    text: theme === 'dark' ? "#6b7280" : "#64748b",
    tooltipBg: theme === 'dark' ? "#0f1115" : "#ffffff",
    tooltipText: theme === 'dark' ? "#ffffff" : "#0f172a"
  }), [theme]);

  const stats = [
    { label: 'Saldo Atual', value: item.saldo.toLocaleString(), sub: item.un, icon: Package, color: 'text-brand-blue' },
    { label: 'Movimento 12M', value: (item.total_mov || 0).toLocaleString(), sub: 'un', icon: RefreshCcw, color: 'text-brand-purple' },
    { label: 'Média Mensal', value: ((item.total_mov || 0) / 12).toFixed(1), sub: 'un/mês', icon: Activity, color: 'text-brand-cyan' },
    { label: 'Necessidade (4m)', value: (item.suggestedPurchase || 0).toLocaleString(), sub: 'sugestão', icon: ShoppingCart, color: 'text-brand-orange' },
    { label: 'Cobertura', value: (item.cobertura || 0).toFixed(1), sub: 'meses', icon: Cpu, color: (item.cobertura || 0) < 1 ? 'text-brand-red' : 'text-brand-green' },
  ];

  const [recommendation, setRecommendation] = useState<string>(item.recommendation || 'Gerando recomendação inteligente...');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (!item.recommendation && !loadingAI) {
      setLoadingAI(true);
      fetch('/api/ai/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item })
      })
      .then(res => res.json())
      .then(data => {
        setRecommendation(data.recommendation || 'Não foi possível gerar uma recomendação no momento.');
      })
      .catch(err => {
        console.error('AI Fetch Error:', err);
        setRecommendation('Erro ao conectar com o serviço de IA.');
      })
      .finally(() => setLoadingAI(false));
    }
  }, [item]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-md" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-brand-container border border-brand-border w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-[2rem] shadow-2xl flex flex-col premium-glass"
        onClick={e => e.stopPropagation()}
      >
        {/* Compact Executive Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-brand-border bg-black/[0.02] dark:bg-black/20">
          <div className="flex items-center gap-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm border ${
              item.curva === 'A' ? 'bg-brand-purple text-white border-purple-400/20' :
              item.curva === 'B' ? 'bg-brand-blue text-white border-blue-400/20' :
              'bg-black/5 dark:bg-black/40 border-brand-border text-brand-text-secondary'
            }`}>
              {item.curva}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className="text-[9px] font-black text-brand-text-secondary opacity-40 uppercase tracking-widest font-mono">CODE: #{item.cod}</span>
                <div className="h-1 w-1 rounded-full bg-brand-border" />
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest font-mono">
                  {cleanFilialName(item.filial)}
                </span>
              </div>
              <h2 className="text-lg font-black text-brand-text-primary leading-tight truncate max-w-[400px]">{item.desc}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex gap-2">
                {item.statusSignal && (
                  <span className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[8px] font-black uppercase tracking-wider border border-brand-blue/20">
                    {item.statusSignal}
                  </span>
                )}
             </div>
             <button 
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-brand-text-secondary hover:text-brand-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Mini Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white dark:bg-brand-card/30 border border-brand-border p-3.5 rounded-2xl flex flex-col hover:border-brand-blue/20 transition-all group shadow-sm">
                 <div className="flex justify-between items-start mb-2">
                    <span className="text-[7px] font-black text-brand-text-secondary uppercase tracking-[0.1em] font-mono opacity-80 dark:opacity-60">{stat.label}</span>
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color} opacity-60 dark:opacity-40 group-hover:opacity-100 transition-opacity`} />
                 </div>
                 <div className="flex items-baseline gap-1">
                    <span className={`text-[17px] font-black tracking-tight ${stat.color}`}>{stat.value}</span>
                    <span className="text-[8px] font-black text-brand-text-secondary uppercase opacity-30 truncate">{stat.sub}</span>
                 </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-12 xl:col-span-7 bg-brand-card dark:bg-brand-card/20 border border-brand-border rounded-[1.5rem] p-5 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[9px] font-black text-brand-text-secondary uppercase tracking-widest flex items-center gap-2">
                   <BarChart2 className="w-3.5 h-3.5 text-brand-blue" />
                   Evolução Histórica (12 Meses)
                </h3>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={item.meses?.map((v: number, i: number) => ({ name: MONTH_NAMES[i], value: v })) || []}>
                    <defs>
                      <linearGradient id="detailHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: chartColors.text, fontSize: 8, fontWeight: 700 }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.grid}`, borderRadius: '12px', color: chartColors.tooltipText }}
                      itemStyle={{ color: chartColors.tooltipText, fontSize: '10px', fontWeight: 700 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={chartColors.stroke} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#detailHist)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Network Area */}
            <div className="lg:col-span-12 xl:col-span-5 bg-brand-card dark:bg-brand-card/20 border border-brand-border rounded-[1.5rem] p-5 shadow-sm flex flex-col">
              <h3 className="text-[9px] font-black text-brand-text-secondary uppercase tracking-widest mb-5 flex items-center gap-2">
                 <Zap className="w-3.5 h-3.5 text-brand-green" />
                 Oportunidade na Rede (OK)
              </h3>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px] pr-2 custom-scrollbar">
                {networkOptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40 dark:opacity-30 text-center py-4">
                    <PackageSearch className="w-6 h-6 mb-2" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Sem saldo integrado</span>
                  </div>
                ) : (
                  <React.Fragment>
                    {networkOptions.map((opt, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-black/20 px-3 py-2.5 rounded-xl border border-brand-border hover:border-brand-green/30 transition-all hover:bg-gray-100 dark:hover:bg-white/[0.05]">
                        <span className="text-[10px] font-bold text-brand-text-primary uppercase">{cleanFilialName(opt.filial)}</span>
                        <div className="flex items-center gap-1.5 min-w-[60px] justify-end">
                           <span className="text-sm font-black text-brand-green">{opt.saldoTransferivel.toLocaleString()}</span>
                           <span className="text-[7px] font-black text-brand-text-secondary opacity-40 dark:opacity-30 uppercase">{opt.un}</span>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                )}
              </div>
              {networkOptions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-brand-border flex justify-between items-center">
                  <span className="text-[8px] font-black text-brand-text-secondary uppercase tracking-[0.1em] opacity-50 dark:opacity-40">Total Transferível</span>
                  <div className="flex items-baseline gap-1 text-brand-text-primary font-black">
                     <span className="text-base tracking-tighter">{networkOptions.reduce((acc, curr) => acc + curr.saldoTransferivel, 0).toLocaleString()}</span>
                     <span className="text-[8px] uppercase opacity-50 dark:opacity-40">{item.un}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Recommendation Section */}
          <div className="p-5 rounded-2xl bg-brand-blue/[0.03] border border-brand-blue/10 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                <Sparkles className="w-12 h-12 text-brand-blue" />
             </div>
             <div className="flex items-start gap-4 relative z-10">
                <div className="w-10 h-10 bg-brand-blue/5 rounded-xl flex items-center justify-center shrink-0 border border-brand-blue/20">
                  {loadingAI ? <RefreshCw className="w-5 h-5 text-brand-blue animate-spin" /> : <ShieldCheck className="w-5 h-5 text-brand-blue" />}
                </div>
                <div>
                  <h4 className="text-[8px] font-black text-brand-blue uppercase tracking-[0.2em] font-mono mb-1.5 flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" /> ESTRATÉGIA RECOMENDADA
                  </h4>
                  <p className={`text-sm font-medium text-brand-text-primary italic leading-snug transition-opacity duration-500 ${loadingAI ? 'opacity-40' : 'opacity-90'}`}>
                    "{recommendation}"
                  </p>
                </div>
             </div>
          </div>
        </div>

        <div className="px-8 py-4 border-t border-brand-border bg-black/[0.02] dark:bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-50">
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-black/5 dark:bg-white/5 border border-brand-border hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-brand-text-secondary"
            >
              Fechar Visualização
            </button>
            <button 
              onClick={onClose}
              className="px-8 py-2 bg-brand-blue text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md hover:brightness-110"
            >
              Exportar Análise
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const CRIT_LABELS: Record<string, string> = {
  URGENTE: 'Ruptura',
  COMPRAR_JA: 'Crítico',
  COMPRAR_BREVE: 'Preventivo',
  OK: 'Saudável',
  ESTOQUE_ALTO: 'Excesso',
  SEM_MOVIMENTO: 'Sem Movimento',
  'CRÍTICO': 'Risco Crítico',
  'MÉDIO': 'Risco Médio',
  'BAIXO': 'Risco Baixo'
};

const CRIT_COLORS: Record<string, string> = {
  URGENTE: '#ef4444',
  COMPRAR_JA: '#f59e0b',
  COMPRAR_BREVE: '#06b6d4',
  OK: '#10b981',
  ESTOQUE_ALTO: '#8b5cf6',
  SEM_MOVIMENTO: '#94a3b8',
  'CRÍTICO': '#f43f5e',
  'MÉDIO': '#f59e0b',
  'BAIXO': '#10b981'
};

const CRIT_ICONS: Record<string, any> = {
  URGENTE: AlertCircle,
  COMPRAR_JA: AlertTriangle,
  COMPRAR_BREVE: Clock,
  OK: CheckCircle2,
  ESTOQUE_ALTO: TrendingUp,
  SEM_MOVIMENTO: EyeOff,
  'CRÍTICO': AlertCircle,
  'MÉDIO': Activity,
  'BAIXO': CheckCircle2
};

function StatusPill({ status, theme }: { status: string, theme: 'light' | 'dark' }) {
  const label = CRIT_LABELS[status] || status;
  const color = CRIT_COLORS[status] || '#cbd5e1';
  const Icon = CRIT_ICONS[status] || Activity;

  return (
    <span 
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm transition-all hover:scale-105"
      style={{ 
        backgroundColor: `${color}15`, 
        color: color, 
        borderColor: `${color}30`
      }}
    >
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function TransferStatusBadge({ label }: { label: string }) {
  if (!label || label === '-') return null;
  const isPartial = label.includes('Parcial') || label.includes('Compra');
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all hover:brightness-110 cursor-default ${
      isPartial 
        ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/20 shadow-orange-500/5' 
        : 'bg-brand-purple/10 text-brand-purple border-brand-purple/20 shadow-purple-500/5'
    }`}>
      {isPartial ? <RefreshCcw className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

function InventoryDashboardView({ 
  data, 
  filteredData,
  filters,
  setFilters,
  selectedFiliais,
  onToggleFilial,
  onClearFilials,
  theme,
  onExportExcel,
  onExportPDF,
  onPrint
}: { 
  data: DashboardData, 
  filteredData: any,
  filters: { filial: string, group: string, fab: string, criterio: string, search: string, abc: string },
  setFilters: { 
    setFilial: (v: string) => void, 
    setGroup: (v: string) => void, 
    setFab: (v: string) => void,
    setCriterio: (v: string) => void, 
    setSearch: (v: string) => void,
    setAbc: (v: string) => void
  },
  selectedFiliais: string[],
  onToggleFilial: (f: string) => void,
  onClearFilials: () => void,
  theme: 'light' | 'dark',
  onExportExcel: (items: any[], type: string) => void,
  onExportPDF: (items: any[], type: string) => void,
  onPrint: () => void
}) {
  const [page, setPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [desiredQtys, setDesiredQtys] = useState<Record<string, number>>({});

  const chartColors = useMemo(() => ({
    grid: theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    text: theme === 'dark' ? "#6b7280" : "#475569",
    tooltipBg: theme === 'dark' ? "#0f1115" : "#ffffff",
    tooltipText: theme === 'dark' ? "#ffffff" : "#0f172a"
  }), [theme]);
  const perPage = 80;
  
  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  if (!filteredData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center bg-brand-card/30 border border-brand-border/20 rounded-[3rem] backdrop-blur-3xl premium-glass premium-shadow">
        <div className="w-24 h-24 bg-brand-yellow/10 rounded-[2rem] flex items-center justify-center mb-8 glow-orange">
          <AlertCircle className="w-12 h-12 text-brand-yellow animate-pulse" />
        </div>
        <h3 className="text-3xl font-black mb-4 tracking-tighter text-brand-text-primary">DADOS INEXISTENTES</h3>
        <p className="text-brand-text-secondary max-w-sm mb-10 font-medium leading-relaxed opacity-80">
          A planilha carregada não possui a estrutura necessária para este modo de visualização. Verifique os títulos das colunas ou altere o tipo de dashboard.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-10 py-4 bg-brand-blue text-white rounded-2xl font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-blue/20 flex items-center gap-3 group"
        >
          <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" /> RECARREGAR SISTEMA
        </button>
      </div>
    );
  }
  
  const { metrics, transferableMap } = filteredData;
  const {
    totalSaldo,
    totalMov,
    totalValorRuptura,
    totalCapitalExcesso,
    totalSemGiroValue,
    totalTransferableVolume,
    totalItemsCount,
    stockoutHighABC,
    uniqueItems,
    uniqueGroups,
    itemsInStockoutCount,
    excessCount,
    semGiroCount,
    filialAgg,
    totalSugestaoSemestre,
    avgCoverage,
    criticalFiliaisCount,
    transferableCount,
    lowMovCount
  } = metrics;

  // Insights Logic
  const insights = useMemo(() => {
    const list: { type: 'critical' | 'warn' | 'info' | 'success', text: string }[] = [];
    
    // Critical Concentration
    if (stockoutHighABC > 0) {
      list.push({ type: 'critical', text: `${stockoutHighABC} SKUs de curva A estão em ruptura crítica.` });
    }

    // Branch risk (we can use filteredData.metrics.filialAgg but wait, App calculated it)
    const stockoutByFilial = filialAgg; // simplified
    const topRisk = Object.entries(stockoutByFilial).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    if (topRisk) {
        // list.push({ type: 'warn', text: `Risco Concentrado: ${cleanFilialName(topRisk[0])} detém maior volume em estoque.` });
    }

    // Capital Imobilizado
    if (totalSemGiroValue > 0) {
      list.push({ type: 'warn', text: `Capital Imobilizado: ${formatCurrency(totalSemGiroValue)} em itens sem giro há > 12 meses.` });
    }
    
    // Efficiency
    const healthyCount = totalItemsCount - (itemsInStockoutCount + excessCount + semGiroCount);
    const efficiency = (totalItemsCount > 0 ? (healthyCount / totalItemsCount) * 100 : 0).toFixed(1);
    list.push({ type: 'info', text: `Eficiência de Estoque: ${efficiency}% da base operando em níveis saudáveis.` });

    return list;
  }, [metrics]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((name, i) => {
      const value = filteredData.filtered.reduce((acc: number, r: any) => acc + (r.meses[i] || 0), 0);
      return {
        name,
        value,
        average: totalItemsCount > 0 ? (totalMov / 12) : 0
      };
    });
  }, [filteredData.filtered, totalMov, totalItemsCount]);

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

  const COLORS = ['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const [viewMode, setViewMode] = useState<'standard' | 'predictive' | 'strategic' | 'purchases' | 'transfers'>('standard');

  const predictions = useMemo(() => {
    const base = filteredData.filtered || [];
    if (viewMode === 'predictive') {
      return base.filter((r: any) => {
        const act = (['RUPTURA', 'REPOSIÇÃO'].includes(r.statusSignal) || (r.suggestedPurchase > 0 && r.statusSignal === 'SAUDÁVEL')) && r.total_mov > 0;
        return act;
      });
    }
    return base;
  }, [filteredData.filtered, viewMode]);

  const slice = predictions.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(predictions.length / perPage);

  const maxTotalMov = useMemo(() => {
    if (predictions.length === 0) return 1;
    let max = 0;
    for (const r of predictions) {
      if (r.total_mov > max) max = r.total_mov;
    }
    return Math.max(max, 1);
  }, [predictions]);

  // Predictive Logic
  const currentMonthIdx = filteredData.currentMonthIdx || 0;

  const predictiveInsights = useMemo(() => {
    const list: string[] = [];
    if (predictions.length > 0) {
      list.push(`Analisando ${predictions.length.toLocaleString()} itens filtrados.`);
    }
    const totalSuggestedQty = predictions.reduce((acc: number, r: any) => acc + r.suggestedPurchase, 0);
    const criticalRuptureCount = predictions.filter((r: any) => r.statusSignal === 'RUPTURA').length;

    if (criticalRuptureCount > 0) list.push(`${criticalRuptureCount} itens com alto risco de ruptura nos próximos 30 dias.`);
    if (totalSuggestedQty > 0) list.push(`Total de ${totalSuggestedQty.toLocaleString()} unidades sugeridas para reposição.`);

    return list;
  }, [predictions]);

  const totalFilialSaldo = useMemo(() => Object.values(filialAgg).reduce((a: number, b: number) => a + (b as number), 0), [filialAgg]);
  
  const [viewType, setViewType] = useState<'grid' | 'table'>('table');
  const [cartItems, setCartItems] = useState<Record<string, { item: any, qty: number, sourceFilial?: string, reason?: string }>>({});
  const [transferSelection, setTransferSelection] = useState<{ item: any, qty: number, options: any[] } | null>(null);
  const [separationModal, setSeparationModal] = useState<{ isOpen: boolean, destBranch: string, email: string } | null>(null);

  const addToCart = (item: any, qty: number, sourceFilial?: string, forcePurchase: boolean = false, autoSplit: boolean = false) => {
    const key = `${item.cod}-${item.filial}`;
    const myFilial = item.filial.split(' - ')[0];
    let reason = item.statusSignal === 'RUPTURA' ? 'Ruptura' : item.saldo <= 0 ? 'Estoque zerado' : 'Reposição Estratégica';

    if (forcePurchase) {
      sourceFilial = myFilial;
    }

    // Lógica para divisão automática entre transferência e compra (Direcionados para Transferência)
    if (autoSplit && !sourceFilial) {
      let remainingNeed = qty;
      const newItems: Record<string, any> = {};

      const sources = (transferableMap[item.cod] || [])
        .map(o => ({
          ...o,
          surplusAvailable: Math.max(0, Math.floor(o.saldo - (o.total_mov / 12) * 2.5))
        }))
        .filter(o => o.filial !== myFilial && o.surplusAvailable > 0)
        .sort((a, b) => b.surplusAvailable - a.surplusAvailable);

      sources.forEach(source => {
        if (remainingNeed <= 0) return;
        const take = Math.min(remainingNeed, source.surplusAvailable);
        const cartKey = `${item.cod}-${item.filial}-${source.filial}`;
        newItems[cartKey] = { item, qty: take, sourceFilial: source.filial, reason: 'Redistribuição de Estoque' };
        remainingNeed -= take;
      });

      if (remainingNeed > 0) {
        newItems[`${item.cod}-${item.filial}-AUTO-PURCHASE`] = {
          item,
          qty: remainingNeed,
          sourceFilial: myFilial,
          reason: qty > remainingNeed ? 'Transferência insuficiente' : reason
        };
      }

      setCartItems(prev => ({ ...prev, ...newItems }));
      setTransferSelection(null);
      return;
    }
    
    // If it's a potential transfer item and no source filial is provided yet, check for options
    if (!sourceFilial) {
      const options = (transferableMap[item.cod] || [])
        .filter((opt: any) => opt.filial !== myFilial && opt.saldo > 0)
        .sort((a: any, b: any) => {
          if (a.total_mov === 0 && b.total_mov !== 0) return -1;
          if (b.total_mov === 0 && a.total_mov !== 0) return 1;
          return b.saldo - a.saldo; 
        });

      if (options.length > 0) {
        setTransferSelection({ item, qty, options });
        return;
      }
    }

    // Split logic: If qty > sourceSaldo, the difference goes to a separate purchase entry
    const chosenSourceData = sourceFilial && sourceFilial !== myFilial 
      ? (transferableMap[item.cod] || []).find((opt: any) => opt.filial === sourceFilial)
      : null;

    const availableToTransfer = chosenSourceData ? chosenSourceData.saldo : 0;
    
    if (chosenSourceData && qty > availableToTransfer) {
      const transferQty = availableToTransfer;
      const purchaseQty = qty - availableToTransfer;

      // Add both parts in one go
      setCartItems(prev => ({
        ...prev,
        [key]: { item, qty: transferQty, sourceFilial, reason: 'Redistribuição Parcial' },
        [`${key}-AUTO-PURCHASE`]: { item, qty: purchaseQty, sourceFilial: myFilial, reason: 'Transferência insuficiente' }
      }));
    } else {
      setCartItems(prev => ({
        ...prev,
        [key]: { item, qty, sourceFilial, reason: sourceFilial && sourceFilial !== myFilial ? 'Redistribuição de Estoque' : reason }
      }));
    }
    
    setTransferSelection(null);
  };

  const removeFromCart = (key: string) => {
    setCartItems(prev => {
      const newCart = { ...prev };
      delete newCart[key];
      return newCart;
    });
  };

  const clearCartByMode = () => {
    const isTransferMode = viewMode === 'transfers';
    const confirmMsg = isTransferMode 
      ? 'Deseja realmente remover todos os itens desta lista de transferência?' 
      : 'Deseja realmente remover todos os itens desta lista de compras?';
    
    if (confirm(confirmMsg)) {
      setCartItems(prev => {
        const newCart = { ...prev };
        Object.entries(newCart).forEach(([key, value]: [string, any]) => {
          const isTransferItem = value.sourceFilial && value.sourceFilial !== value.item.filial.split(' - ')[0];
          if (isTransferMode && isTransferItem) {
            delete newCart[key];
          } else if (!isTransferMode && !isTransferItem) {
            delete newCart[key];
          }
        });
        return newCart;
      });
    }
  };

  const processAllTransfers = () => {
    const newCart = { ...cartItems };
    let transferCount = 0;
    let purchaseCount = 0;
    
    predictions.filter((p: any) => p.transferDirection !== 'NENHUMA').forEach((r: any) => {
      const desiredQty = desiredQtys[`${r.cod}-${r.filial}`] ?? r.recommendedTransferQty;
      if (desiredQty <= 0) return;

      const myFilialCode = r.filial.split(' - ')[0];
      
      if (r.transferDirection === 'SAIDA') {
        // Current filial is the source (Outputting surplus)
        const key = `${r.cod}-${r.filial}-OUT`;
        if (!newCart[key]) {
          // In SAIDA mode, filial destination is r.transferIdealFilial
          // But our cart structure uses [itemKey]: { item, qty, sourceFilial }
          // item is the DESTINATION record (because cart items are usually needs)
          // find the destination record in data.inventoryRecords
          const destRecord = data.inventoryRecords.find((ir: any) => ir.cod === r.cod && ir.filial.startsWith(r.transferIdealFilial)) || r;
          
          newCart[`${r.cod}-${destRecord.filial}`] = { 
            item: destRecord, 
            qty: desiredQty, 
            sourceFilial: myFilialCode 
          };
          transferCount++;
        }
      } else {
        // ENTRADA: Current filial has a need. We need to find sources.
        let remainingNeed = desiredQty;
        
        // Use transferables (refined with surplus rule)
        const sources = (transferableMap[r.cod] || [])
          .map(o => ({
            ...o,
            surplusAvailable: Math.max(0, Math.floor(o.saldo - (o.total_mov / 12) * 2.5))
          }))
          .filter(o => o.filial !== myFilialCode && o.surplusAvailable > 0)
          .sort((a, b) => b.surplusAvailable - a.surplusAvailable);

        sources.forEach(source => {
          if (remainingNeed <= 0) return;
          const take = Math.min(remainingNeed, source.surplusAvailable);
          
          const cartKey = `${r.cod}-${r.filial}-${source.filial}`;
          if (!newCart[cartKey]) {
            newCart[cartKey] = {
              item: r,
              qty: take,
              sourceFilial: source.filial
            };
            remainingNeed -= take;
            transferCount++;
          }
        });

        // Remaining need goes to purchase
        if (remainingNeed > 0) {
          const purchaseKey = `${r.cod}-${r.filial}-AUTO-PURCHASE`;
          if (!newCart[purchaseKey]) {
            newCart[purchaseKey] = {
              item: r,
              qty: remainingNeed,
              sourceFilial: myFilialCode // Marked as local purchase
            };
            purchaseCount++;
          }
        }
      }
    });

    setCartItems(newCart);
    alert(`Processamento concluído: ${transferCount} transferências e ${purchaseCount} compras automáticas geradas.`);
  };

  const { purchaseItems, transferItems } = useMemo(() => {
    if (viewMode !== 'purchases' && viewMode !== 'transfers') return { purchaseItems: [], transferItems: [] };
    
    // items that were MANUALLY added to the cart
    const itemsInCart = Object.values(cartItems);

    const pItems = itemsInCart.filter(({ item, sourceFilial }) => {
      const myFilial = item.filial.split(' - ')[0];
      return sourceFilial === myFilial;
    }).map(({ item, qty, reason }) => ({ ...item, desiredQty: qty, originReason: reason }));

    const tItems = itemsInCart.filter(({ item, sourceFilial }) => {
      const myFilial = item.filial.split(' - ')[0];
      return sourceFilial && sourceFilial !== myFilial;
    }).map(({ item, qty, sourceFilial, reason }) => {
      const options = (transferableMap[item.cod] || [])
        .filter((opt: any) => opt.filial !== item.filial.split(' - ')[0] && opt.saldo > 0)
        .sort((a: any, b: any) => b.saldo - a.saldo);
      
      const chosenSource = sourceFilial || options[0]?.filial || '?';
      const sourceData = options.find(o => o.filial === chosenSource);

      return { 
        ...item, 
        desiredQty: qty,
        sourceFilial: chosenSource,
        sourceSaldo: sourceData?.saldo || 0,
        originReason: reason
      };
    });
    
    return { purchaseItems: pItems, transferItems: tItems };
  }, [viewMode, cartItems, transferableMap]);

  // Group transfer items by destination filial
  const groupedTransfers = useMemo(() => {
    const groups: Record<string, any[]> = {};
    transferItems.forEach(item => {
      const dest = item.filial.split(' - ')[0];
      if (!groups[dest]) groups[dest] = [];
      groups[dest].push(item);
    });
    return groups;
  }, [transferItems]);

  const groupedPurchases = useMemo(() => {
    const groups: Record<string, any[]> = {};
    purchaseItems.forEach(item => {
      const vendor = item.fab || 'NÃO INFORMADO';
      if (!groups[vendor]) groups[vendor] = [];
      groups[vendor].push(item);
    });
    return groups;
  }, [purchaseItems]);

  const actionFilteredData = slice;

  return (
    <React.Fragment>
      <AnimatePresence>
        {transferSelection && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-brand-container border border-brand-border w-full max-w-xl overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col premium-glass premium-shadow"
            >
              <div className="px-8 py-6 border-b border-brand-border bg-black/[0.02] dark:bg-black/20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20">
                    <RefreshCcw className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-brand-text-primary tracking-tight uppercase">Origem da Transferência</h3>
                    <p className="text-[10px] text-brand-text-secondary font-black tracking-widest opacity-60 uppercase font-mono">#{transferSelection.item.cod} • SELECIONE A FILIAL</p>
                  </div>
                </div>
                <button onClick={() => setTransferSelection(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-brand-text-secondary" />
                </button>
              </div>

              <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="p-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 mb-2">
                  <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest opacity-80 block mb-1">Destino</span>
                  <div className="text-[13px] font-black text-brand-text-primary">{transferSelection.item.filial}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-black text-brand-text-secondary uppercase tracking-[0.2em] opacity-40">Filiais Disponíveis</div>
                  <button 
                    onClick={() => addToCart(transferSelection.item, transferSelection.qty, undefined, true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-red/10 text-brand-red border border-brand-red/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    REQUISITAR COMPRA
                  </button>
                </div>
                
                {transferSelection.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => addToCart(transferSelection.item, transferSelection.qty, opt.filial)}
                    className="w-full text-left p-4 rounded-2xl border border-brand-border hover:border-brand-green hover:bg-brand-green/[0.03] transition-all group flex items-center justify-between relative overflow-hidden"
                  >
                    {opt.total_mov === 0 && (
                      <div className="absolute top-0 right-0 px-3 py-1 bg-brand-green text-white text-[7px] font-black rounded-bl-lg tracking-widest uppercase">
                        SEM MOVIMENTAÇÃO
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[14px] font-black text-brand-text-primary group-hover:text-brand-green transition-colors uppercase tracking-tight">{opt.filial}</span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] font-black text-brand-text-secondary opacity-40 uppercase font-mono tracking-widest">Saldo: {opt.saldo.toLocaleString()}</span>
                        <div className="w-1 h-1 rounded-full bg-brand-border" />
                        <span className={`text-[9px] font-black uppercase font-mono tracking-widest ${opt.total_mov === 0 ? 'text-brand-green' : 'text-brand-text-secondary opacity-40'}`}>
                          Mov 12M: {opt.total_mov.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-brand-text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>

              <div className="p-6 bg-black/[0.01] dark:bg-black/10 border-t border-brand-border flex justify-end">
                <button 
                  onClick={() => setTransferSelection(null)}
                  className="px-6 py-2.5 text-[10px] font-black text-brand-text-secondary hover:text-brand-text-primary uppercase tracking-widest transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-10">
        {/* Interactive Criteria Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
            {[
              { id: '', label: 'Panorama', count: filteredData.counts.ALL, color: 'brand-blue', icon: LayoutDashboard },
              { id: 'COMPRA', label: 'Compra', count: filteredData.counts.COMPRA, color: 'brand-red', icon: ShoppingCart },
              { id: 'TRANSFERENCIA', label: 'Transferir', count: filteredData.counts.TRANSFERENCIA, color: 'brand-green', icon: ArrowRightLeft },
              { id: 'URGENTE', label: 'Ruptura', count: filteredData.counts.URGENTE, color: 'brand-red', icon: AlertCircle },
              { id: 'COMPRAR_JA', label: 'Crítico', count: filteredData.counts.COMPRAR_JA, color: 'brand-orange', icon: RefreshCcw },
              { id: 'COMPRAR_BREVE', label: 'Atenção', count: filteredData.counts.COMPRAR_BREVE, color: 'brand-blue', icon: FilePlus },
              { id: 'OK', label: 'Saudável', count: filteredData.counts.OK, color: 'brand-green', icon: CheckCircle2 },
              { id: 'ESTOQUE_ALTO', label: 'Excesso', count: filteredData.counts.ESTOQUE_ALTO, color: 'brand-purple', icon: Package },
              { id: 'SEM_MOVIMENTO', label: 'Sem Movimento', count: filteredData.counts.SEM_MOVIMENTO, color: 'brand-text-secondary', icon: EyeOff },
            ].map((card, idx) => {
              const isActive = filters.criterio === card.id;
              const Icon = card.icon as any;
              
              return (
                <motion.button
                  key={card.id || 'all'}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => setFilters.setCriterio(isActive ? '' : card.id)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between min-h-[110px] relative overflow-hidden group shadow-soft ${
                    isActive 
                    ? 'bg-brand-card border-brand-blue/60 shadow-xl ring-4 ring-brand-blue/5 scale-[1.02] z-20' 
                    : 'bg-brand-card dark:bg-brand-card/30 border-brand-border dark:border-white/5 hover:border-brand-blue/40 hover:bg-brand-hover hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between w-full relative z-10">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-blue/20 text-brand-blue' : 'bg-gray-100 dark:bg-white/5 text-brand-text-secondary'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />}
                  </div>
                  
                  <div className="mt-3 relative z-10 text-left">
                    <div className={`text-3xl font-black tracking-tighter leading-tight mb-0.5 text-${card.color}`}>
                      {card.count.toLocaleString()}
                    </div>
                    <div className={`text-[11px] font-black uppercase tracking-[0.1em] text-${card.color} opacity-80`}>
                      {card.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        
        {/* Performance por Unidade - Fixed in all tabs */}
        <div className="bg-brand-container/20 border-y border-brand-border/5 py-6 premium-shadow relative">
            <div className="max-w-7xl mx-auto px-4 mb-4 flex items-center justify-between gap-6 relative z-20">
              <div>
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-text-secondary mb-0.5 font-mono flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-brand-purple rounded-full" />
                  Performance por Unidade
                </h3>
              </div>
            </div>
            
            <div className="w-full px-6 pb-12">
              <div className="flex flex-wrap gap-2.5 justify-center max-w-full mx-auto">
              {data.filiais.map((f: string, idx: number) => {
                const isSelected = selectedFiliais.includes(f);
                const active = selectedFiliais.length === 0 || isSelected;
                
                return (
                  <motion.div 
                    whileHover={{ y: -4, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={f} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.01 }}
                                        onClick={() => onToggleFilial(f)}
                    className={`px-6 py-4 rounded-xl border-2 transition-all cursor-pointer group flex items-center justify-center min-w-[140px] max-w-[200px] flex-1 min-h-[70px] relative overflow-hidden backdrop-blur-xl shadow-soft ${
                      isSelected 
                      ? 'bg-brand-purple shadow-[0_20px_40px_rgba(168,85,247,0.4)] border-brand-purple ring-2 ring-white/10' 
                      : 'bg-brand-card dark:bg-white/5 border-brand-border dark:border-white/10 hover:border-brand-purple/50 hover:bg-brand-hover hover:shadow-md'
                    } ${!active ? 'opacity-30 grayscale' : 'opacity-100'}`}
                  >
                    <div className="relative z-10 text-center">
                      <div className={`text-[12px] font-black tracking-tighter uppercase line-clamp-1 transition-all ${isSelected ? 'text-white' : 'text-brand-text-primary dark:text-brand-text-secondary dark:group-hover:text-white'}`}>
                        {f.split(' - ')[0]}
                      </div>
                    </div>

                    {isSelected && (
                      <motion.div 
                        layoutId="glow-bg"
                        className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none" 
                      />
                    )}
                  </motion.div>
                );
              })}
              </div>
            </div>
          </div>



        {/* Predictive Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-container/30 border border-brand-border/20 p-3 rounded-[1.5rem] premium-shadow premium-glass">
          <div className="flex items-center gap-4">
          <div className="flex p-1 bg-gray-200 dark:bg-black/40 rounded-xl border border-brand-border dark:border-white/5 backdrop-blur-md transition-colors">
              <button 
                onClick={() => setViewMode('standard')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'standard' ? 'bg-brand-blue text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Operacional
              </button>
              <button 
                onClick={() => setViewMode('predictive')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'predictive' ? 'bg-brand-purple text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <Clock className="w-3.5 h-3.5" />
                Inteligência Preditiva
              </button>
              <button 
                onClick={() => setViewMode('purchases')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all relative ${viewMode === 'purchases' ? 'bg-brand-red text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Compras
                {purchaseItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red text-[8px] font-black text-white ring-2 ring-brand-container">
                    {purchaseItems.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setViewMode('transfers')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all relative ${viewMode === 'transfers' ? 'bg-brand-green text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Transferências
                {transferItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red text-[8px] font-black text-white ring-2 ring-brand-container">
                    {transferItems.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setViewMode('strategic')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'strategic' ? 'bg-brand-blue text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                KPIs Estratégicos
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">

          </div>
        </div>

      <div className="bg-brand-container/40 border border-brand-border/30 rounded-[2.5rem] overflow-hidden shadow-2xl relative premium-glass backdrop-blur-[40px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-8 py-6 gap-6 border-b border-brand-border bg-brand-card/10 backdrop-blur-3xl sticky top-0 z-[30]">
                <div className="flex flex-wrap items-center gap-4">
                  {viewMode === 'standard' && (
                    <div className="flex items-center gap-3.5 bg-brand-blue/5 dark:bg-brand-blue/10 border border-brand-blue/10 dark:border-brand-blue/20 px-4 py-2 rounded-xl">
                      <div className="h-2 w-2 rounded-full bg-brand-blue animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                      <span className="text-[10px] font-black font-mono text-brand-blue uppercase tracking-widest">
                        {filteredData.filtered.length.toLocaleString()} SKUs INDEXADOS
                      </span>
                    </div>
                  )}

                  {/* Active Filter Indicators */}
                  {(filters.filial || filters.group || filters.fab || filters.abc || filters.criterio) && (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-px bg-brand-border mx-1" />
                      <span className="text-[9px] font-black text-brand-text-secondary uppercase">Ativos:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {filters.filial && <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[8px] font-black rounded-lg border border-brand-blue/20">Filial</span>}
                        {filters.group && <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[8px] font-black rounded-lg border border-brand-blue/20">Grupo</span>}
                        {filters.fab && <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[8px] font-black rounded-lg border border-brand-blue/20">Fabricante</span>}
                        {filters.abc && <span className="px-2 py-0.5 bg-brand-purple/10 text-brand-purple text-[8px] font-black rounded-lg border border-brand-purple/20">Curva {filters.abc}</span>}
                        {filters.criterio && <span className="px-2 py-0.5 bg-brand-yellow/10 text-brand-yellow text-[8px] font-black rounded-lg border border-brand-yellow/20">Status</span>}
                        
                        <button 
                          onClick={() => {
                            setFilters.setFilial('');
                            setFilters.setGroup('');
                            setFilters.setFab('');
                            setFilters.setAbc('');
                            setFilters.setCriterio('');
                          }}
                          className="ml-1 p-1 hover:bg-black/10 rounded-full transition-colors group"
                          title="Limpar filtros da lista"
                        >
                          <X className="w-3 h-3 text-brand-text-secondary opacity-50 group-hover:opacity-100" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="h-6 w-px bg-brand-border mx-2" />
                  
          <div className="flex bg-gray-100 dark:bg-black/20 border border-brand-border rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewType('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewType === 'grid' ? 'bg-brand-blue text-white shadow-lg' : 'text-brand-text-secondary opacity-40 hover:opacity-100 dark:hover:opacity-80'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`p-1.5 rounded-lg transition-all ${viewType === 'table' ? 'bg-brand-blue text-white shadow-lg' : 'text-brand-text-secondary opacity-40 hover:opacity-100 dark:hover:opacity-80'}`}
            >
              <TableProperties className="w-4 h-4" />
            </button>
          </div>

                  <div className="h-6 w-px bg-brand-border mx-2" />

                  {(viewMode === 'standard' || viewMode === 'predictive') && (
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-black/40 rounded-2xl border border-brand-border/40 backdrop-blur-xl">
                      {[
                        { id: '', label: 'Panorama Geral', icon: Layers, color: 'brand-blue' },
                        { id: 'COMPRA', label: 'Direcionados para Compra', icon: ShoppingCart, color: 'brand-red' },
                        { id: 'TRANSFERENCIA', label: 'Direcionados para Transferência', icon: ArrowRightLeft, color: 'brand-green' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setFilters.setCriterio(tab.id)}
                          className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${
                            filters.criterio === tab.id 
                            ? `bg-${tab.color} text-white shadow-lg scale-[1.02] z-10` 
                            : 'text-brand-text-secondary hover:text-brand-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <tab.icon className={`w-4 h-4 ${filters.criterio === tab.id ? 'animate-pulse' : ''}`} />
                          {tab.label}
                          {filters.criterio === tab.id && (
                            <motion.div 
                              layoutId="activeTabGlow"
                              className="absolute inset-0 bg-white/10 pointer-events-none" 
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {(viewMode === 'standard' || viewMode === 'predictive') && filters.criterio === '' && (
                    <>
                      <div className="h-6 w-px bg-brand-border mx-2" />
                      
                      <div className="flex bg-gray-100 dark:bg-black/20 border border-brand-border rounded-xl p-1 gap-1">
                        <button
                          onClick={() => setViewMode('standard')}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${viewMode === 'standard' ? 'bg-brand-blue text-white shadow-lg' : 'text-brand-text-secondary opacity-40 hover:opacity-100 dark:hover:opacity-80'}`}
                        >
                          Padrão
                        </button>
                        <button
                          onClick={() => setViewMode('predictive')}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${viewMode === 'predictive' ? 'bg-brand-blue text-white shadow-lg' : 'text-brand-text-secondary opacity-40 hover:opacity-100 dark:hover:opacity-80'}`}
                        >
                          Preditivo
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {selectedFiliais.length > 0 && (
                  <button 
                    onClick={onClearFilials}
                    className="flex items-center gap-2 text-brand-blue hover:text-brand-blue/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Limpar Filtros ({selectedFiliais.length})</span>
                  </button>
                )}
              </div>
            </div>

        {viewMode === 'predictive' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {filters.criterio === 'TRANSFERENCIA' && (
              <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-blue/20 rounded-2xl flex items-center justify-center border border-brand-blue/30 shadow-inner">
                    <Zap className="w-6 h-6 text-brand-blue animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-brand-text-primary uppercase tracking-tight">Automação de Transferência Inteligente</h4>
                    <p className="text-[10px] text-brand-text-secondary font-medium opacity-70">Identificamos {predictions.filter((p:any) => p.transferDirection !== 'NENHUMA').length} oportunidades de otimização de estoque.</p>
                  </div>
                </div>
                <button 
                  onClick={processAllTransfers}
                  className="w-full md:w-auto px-8 py-3 bg-brand-blue text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3"
                >
                  <RefreshCcw className="w-4 h-4" /> Processar Todas as Sugestões
                </button>
              </div>
            )}

            {viewType === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {predictions.slice(0, 100).map((r: any, idx: number) => {
                  const s = r.ruptureRisk;
                  const color = s === 'CRÍTICO' ? '#ef4444' : s === 'MÉDIO' ? '#f59e0b' : '#10b981';
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: (idx % 12) * 0.02 }}
                      key={`${r.cod}-${r.filial}`} 
                      onClick={() => setSelectedItem(r)}
                      className="group relative bg-white dark:bg-zinc-900 border border-brand-border/50 rounded-3xl overflow-hidden hover:border-brand-purple/30 transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-2xl hover:shadow-brand-purple/5 flex flex-col h-full"
                    >
                      {/* Status Bar */}
                      <div className="h-1.5 w-full flex">
                        <div className="h-full flex-1" style={{ backgroundColor: color }} />
                        <div className="h-full w-24 bg-zinc-100 dark:bg-white/5" />
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-brand-purple text-white font-black text-[9px] tracking-widest shadow-sm border border-white/10">
                                {r.curva}
                              </span>
                              <span className="font-mono text-[9px] text-brand-text-secondary font-medium opacity-40">
                                #{r.cod}
                              </span>
                            </div>
                            <h4 className="text-[14px] font-bold text-brand-text-primary leading-snug line-clamp-2 h-[40px] group-hover:text-brand-purple transition-colors">
                              {r.desc}
                            </h4>
                          </div>
                          
                          <div 
                            className="shrink-0 flex flex-col items-end"
                          >
                            <StatusPill status={r.ruptureRisk} theme={theme} />
                            <span className="text-[8px] font-black text-brand-text-secondary uppercase tracking-tighter opacity-40 mt-1">
                              {cleanFilialName(r.filial)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-brand-border/50 flex flex-col relative overflow-hidden group/item">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-brand-text-secondary/5 -mr-4 -mt-4 rounded-full group-hover/item:scale-150 transition-transform" />
                            <span className="text-[8px] font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5 opacity-60">Saldo Atual</span>
                            <div className="flex items-baseline gap-1 relative z-10">
                              <span className="text-[18px] font-black tracking-tighter text-brand-text-primary">
                                {r.saldo.toLocaleString()}
                              </span>
                              <span className="text-[9px] font-medium text-brand-text-secondary uppercase font-mono opacity-40">{r.un}</span>
                            </div>
                          </div>
                          <div className="p-3 rounded-2xl bg-brand-purple/5 border border-brand-purple/10 flex flex-col relative overflow-hidden group/item">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-brand-purple/5 -mr-4 -mt-4 rounded-full group-hover/item:scale-150 transition-transform" />
                            <span className="text-[8px] font-bold text-brand-purple uppercase tracking-widest mb-1.5 opacity-70">Sugestão AI</span>
                            <div className="relative z-10">
                              <span className="text-[18px] font-black tracking-tighter text-brand-purple">
                                {r.suggestedPurchase.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-border/50">
                          <div className="flex flex-col">
                             <span className="text-[8px] font-bold text-brand-text-secondary uppercase opacity-50 tracking-widest mb-1">Demanda 4M (Proj)</span>
                             <div className="flex items-center gap-2">
                               <TrendingUp className="w-3 h-3 text-brand-blue" />
                               <span className="text-[13px] font-black text-brand-blue">{Math.round(r.totalProjected).toLocaleString()}</span>
                             </div>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-[8px] font-bold text-brand-text-secondary uppercase opacity-50 tracking-widest mb-1">Média 12M</span>
                             <div className="flex items-center gap-2">
                               <Activity className="w-3 h-3 text-brand-text-primary opacity-30" />
                               <span className="text-[13px] font-black text-brand-text-primary">{Math.round(r.total_mov / 12).toLocaleString()}</span>
                             </div>
                          </div>
                        </div>

                        {/* Transfer Options Pill List */}
                        {(transferableMap[r.cod] || []).filter(opt => opt.filial !== r.filial.split(' - ')[0] && opt.saldo > 0).length > 0 && (
                          <div className="mt-6 pt-4 border-t border-brand-border/50">
                            <span className="text-[8px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] mb-2 block opacity-50">Transferência Recomendada:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(transferableMap[r.cod] || [])
                                .filter(opt => opt.filial !== r.filial.split(' - ')[0] && opt.saldo > 0)
                                .slice(0, 3)
                                .map((opt, i) => (
                                  <div key={i} className={`px-2 py-1 text-[7px] font-black rounded-lg border flex items-center gap-1.5 ${opt.total_mov === 0 ? 'bg-brand-green/10 text-brand-green border-brand-green/20' : 'bg-brand-blue/5 text-brand-blue border-brand-blue/10'}`}>
                                    <MapPin className="w-2.5 h-2.5 opacity-50" />
                                    {cleanFilialName(opt.filial)} {opt.total_mov === 0 && <span className="text-[6px] px-1 bg-brand-green text-white rounded">SEM GIRO</span>}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="px-6 py-4 bg-zinc-50 dark:bg-black/20 border-t border-brand-border/50 flex items-center justify-between gap-4 mt-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-bold text-brand-text-secondary uppercase tracking-widest opacity-60">Qtd.</span>
                          <input 
                            type="number"
                            className="w-[84px] bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-border rounded-xl px-3 py-1.5 text-[12px] font-black text-brand-purple dark:text-white focus:border-brand-purple outline-none transition-all shadow-sm"
                            value={desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase}
                            onChange={(e) => setDesiredQtys({
                              ...desiredQtys,
                              [`${r.cod}-${r.filial}`]: parseInt(e.target.value) || 0
                            })}
                          />
                        </div>
                        {cartItems[`${r.cod}-${r.filial}`] ? (
                          <button 
                            className="flex-1 bg-brand-red text-white h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20"
                            onClick={() => removeFromCart(`${r.cod}-${r.filial}`)}
                          >
                            <X className="w-4 h-4" /> Remover
                          </button>
                        ) : (
                          <button 
                            className="flex-1 bg-brand-purple text-white h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20"
                            onClick={() => addToCart(r, desiredQtys[`${r.cod}-${r.filial}`] ?? (filters.criterio === 'TRANSFERENCIA' ? r.recommendedTransferQty : r.suggestedPurchase), undefined, false, true)}
                          >
                            <Sparkles className="w-4 h-4" /> Requisitar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* Predictive Table */
              <div className="bg-brand-container/40 border border-brand-border/10 rounded-2xl overflow-hidden shadow-2xl relative premium-glass backdrop-blur-3xl">
                <div className="overflow-x-auto max-h-[600px] hide-scrollbar">
                  <table className="w-full text-left text-xs border-separate border-spacing-0">
                    <thead className="sticky top-0 bg-brand-card/90 backdrop-blur-3xl z-20">
                      <tr>
                        <th className="px-6 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Cód</th>
                        <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Descrição</th>
                        {filters.criterio === 'TRANSFERENCIA' ? (
                          <>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Filial Origem</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Saldo Origem</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Filial Destino</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Saldo Destino</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Qtd. Recomendada</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Qtd. Desejada</th>
                            <th className="px-6 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Status / Justificativa</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono text-center">Filial</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Saldo</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Mov. 12M</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Demanda 4m</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Sugestão</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Qtd. Desejada</th>
                            <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono text-center">Disponível para Transferência</th>
                          </>
                        )}
                        <th className="px-4 py-4 border-b border-brand-border/10 text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center whitespace-nowrap font-mono">Ação</th>
</tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {predictions.slice(0, 100).map((r: any, idx: number) => (
                        <tr key={`${r.cod}-${r.filial}`} 
                          className="hover:bg-brand-purple/[0.03] transition-all group duration-300 cursor-pointer"
                          onClick={() => setSelectedItem(r)}
                        >
                          <td className="px-6 py-4 font-mono font-black text-[10px] text-brand-purple opacity-80">#{r.cod}</td>
                          <td className="px-4 py-4">
                            <div className="text-[13px] font-black text-brand-text-primary truncate max-w-[320px] group-hover:text-brand-purple transition-colors">{r.desc}</div>
                            <div className="text-[9px] uppercase font-bold text-brand-text-secondary mt-0.5 opacity-60 tracking-widest">{r.curva} • {r.grupo}</div>
                          </td>
                          {filters.criterio === 'TRANSFERENCIA' ? (
                            <>
                              <td className="px-4 py-4 text-center font-black text-[11px] text-brand-text-secondary uppercase tracking-tight">
                                {r.transferDirection === 'SAIDA' ? cleanFilialName(r.filial) : r.transferIdealFilial}
                              </td>
                              <td className="px-4 py-4 text-right font-black text-[12px] text-brand-text-primary">
                                {r.transferDirection === 'SAIDA' ? r.saldo.toLocaleString() : (r.totalNetworkSurplus.toLocaleString())}
                              </td>
                              <td className="px-4 py-4 text-center font-black text-[11px] text-brand-blue uppercase tracking-tight">
                                {r.transferDirection === 'SAIDA' ? r.transferIdealFilial : cleanFilialName(r.filial)}
                              </td>
                              <td className="px-4 py-4 text-right font-black text-[12px] text-brand-text-primary">
                                {r.saldoDestino.toLocaleString()}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="px-2 py-1 bg-brand-orange/10 text-brand-orange text-[11px] font-black rounded border border-brand-orange/20">
                                  {r.recommendedTransferQty}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="number"
                                  className="w-16 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-border rounded-lg px-2 py-1 text-[11px] font-black text-center text-brand-text-primary dark:text-white focus:border-brand-blue outline-none shadow-inner"
                                  value={desiredQtys[`${r.cod}-${r.filial}`] ?? r.recommendedTransferQty}
                                  onChange={(e) => setDesiredQtys({
                                    ...desiredQtys,
                                    [`${r.cod}-${r.filial}`]: parseInt(e.target.value) || 0
                                  })}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1.5 leading-tight">
                                  <TransferStatusBadge label={r.transferStatusLabel} />
                                  <div className="text-[10px] font-semibold text-brand-text-secondary italic max-w-[250px]">
                                    {r.transferJustification}
                                  </div>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-4 text-center font-black text-[11px] text-brand-text-secondary dark:text-zinc-400 uppercase tracking-tight">
                                {r.filial.split(' - ')[0]}
                              </td>
                              <td className="px-4 py-4 text-center font-black text-brand-text-primary text-[13px]">
                                {r.saldo.toLocaleString()} <span className="text-[9px] text-brand-text-secondary opacity-40 font-mono italic">{r.un}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="font-black text-brand-text-primary text-[12px]">{Math.round(r.total_mov).toLocaleString()}</div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="font-black text-brand-blue text-[13px] tracking-tight">{Math.round(r.totalProjected).toLocaleString()}</div>
                                <div className="text-[8px] text-brand-text-secondary font-black tracking-widest uppercase mt-0.5 opacity-50 font-mono">SCORE 4M</div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className={`text-[14px] font-black ${r.suggestedPurchase > 0 ? 'text-brand-orange' : 'text-brand-green opacity-20'}`}>
                                  {r.suggestedPurchase.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="number"
                                  className="w-16 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-border rounded-lg px-2 py-1 text-[11px] font-black text-center text-brand-text-primary dark:text-white focus:border-brand-blue outline-none shadow-inner"
                                  value={desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase}
                                  onChange={(e) => setDesiredQtys({
                                    ...desiredQtys,
                                    [`${r.cod}-${r.filial}`]: parseInt(e.target.value) || 0
                                  })}
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-1 justify-center max-w-[200px] mx-auto">
                                  {(transferableMap[r.cod] || [])
                                    .filter(opt => opt.filial !== r.filial.split(' - ')[0] && opt.saldo > 0)
                                    .map((opt, i) => {
                                      const isSelected = cartItems[`${r.cod}-${r.filial}`]?.sourceFilial === opt.filial;
                                      return (
                                        <button 
                                          key={i} 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(r, desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase, opt.filial);
                                          }}
                                          className={`px-1.5 py-0.5 text-[7px] font-black rounded border uppercase transition-all ${
                                            isSelected 
                                              ? 'bg-brand-green text-white border-brand-green shadow-sm scale-105 z-10' 
                                              : opt.total_mov === 0 
                                                ? 'bg-brand-green/10 text-brand-green border-brand-green/20' 
                                                : 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                                          }`}
                                        >
                                          {opt.filial} {opt.total_mov === 0 && '• SM'}
                                        </button>
                                      );
                                    })}
                                </div>
                              </td>
                            </>
                          )}
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {cartItems[`${r.cod}-${r.filial}`] ? (
                              <button 
                                onClick={() => removeFromCart(`${r.cod}-${r.filial}`)}
                                className="p-2 bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white rounded-lg transition-all"
                                title="Remover item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => addToCart(r, desiredQtys[`${r.cod}-${r.filial}`] ?? (filters.criterio === 'TRANSFERENCIA' ? r.recommendedTransferQty : r.suggestedPurchase), undefined, false, true)}
                                className="p-2 bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white rounded-lg transition-all"
                                title="Adicionar item"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {viewMode === 'purchases' && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-4xl mx-auto">
              {/* CARD: COMPRA INTERNA */}
              <div className="bg-brand-card border-2 border-brand-border rounded-[2.5rem] p-8 shadow-soft flex flex-col min-h-[600px] hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center border border-brand-red/20 shadow-lg glow-red">
                      <ShoppingCart className="w-6 h-6 text-brand-red" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-brand-text-primary tracking-tight mb-1 uppercase">Requisição de Compra</h3>
                      <p className="text-[10px] text-brand-text-secondary font-black uppercase tracking-widest opacity-60">Sem estoque transferível na rede</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onExportExcel(purchaseItems, 'Compra')}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-black/20 hover:bg-brand-blue/10 rounded-xl text-[9px] font-black text-brand-text-secondary hover:text-brand-blue uppercase tracking-widest transition-all border border-brand-border/10"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> EXCEL
                    </button>
                    <button 
                      onClick={() => onExportPDF(purchaseItems, 'Compra')}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-black/20 hover:bg-brand-red/10 rounded-xl text-[9px] font-black text-brand-text-secondary hover:text-brand-red uppercase tracking-widest transition-all border border-brand-border/10"
                    >
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button 
                      onClick={onPrint}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-black/20 hover:bg-brand-purple/10 rounded-xl text-[9px] font-black text-brand-text-secondary hover:text-brand-purple uppercase tracking-widest transition-all border border-brand-border/10"
                    >
                      <Printer className="w-4 h-4" /> IMPRIMIR
                    </button>
                    {purchaseItems.length > 0 && (
                      <button 
                        onClick={clearCartByMode}
                        className="flex items-center gap-2 px-3 py-2 bg-brand-red/5 hover:bg-brand-red/20 rounded-xl text-[9px] font-black text-brand-red uppercase tracking-widest transition-all border border-brand-red/20 ml-2"
                      >
                        <Trash2 className="w-4 h-4" /> Limpar Todos
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-auto max-h-[600px] space-y-6 pr-2 custom-scrollbar">
                  {Object.keys(groupedPurchases).length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center p-10 text-center opacity-40">
                      <CheckCircle2 className="w-16 h-16 mb-4 text-brand-green animate-pulse" />
                      <p className="text-sm font-black uppercase tracking-widest">Nenhuma compra adicionada</p>
                      <p className="text-[10px] mt-2 max-w-[250px]">Adicione itens na aba operacional ou use a inteligência para reposição.</p>
                    </div>
                  ) : (
                    (Object.entries(groupedPurchases) as [string, any[]][]).map(([vendor, items]) => (
                      <div key={vendor} className="bg-zinc-50/50 dark:bg-white/5 border border-brand-border/30 rounded-3xl overflow-hidden hover:border-brand-blue/30 transition-all shadow-sm">
                        <div className="px-6 py-3 bg-brand-red/5 border-b border-brand-border/30 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-red/10 rounded-xl flex items-center justify-center border border-brand-red/20 shadow-sm">
                              <Factory className="w-4 h-4 text-brand-red" />
                            </div>
                            <div>
                              <h4 className="text-[11px] font-black text-brand-text-primary uppercase tracking-tight">Fornecedor: {vendor}</h4>
                              <p className="text-[9px] text-brand-text-secondary font-bold opacity-60 uppercase">{items.length} itens para pedido</p>
                            </div>
                          </div>
                          <div className="px-2.5 py-1 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red text-[8px] font-black uppercase tracking-widest">
                            Pendente
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10">Item</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center">Filial</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center font-mono">Saldo</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center font-mono">Reposição</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center">Origem</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/5">
                              {items.map((r: any) => (
                                <tr key={`${r.cod}-${r.filial}`} className="hover:bg-brand-hover/40 transition-colors group">
                                  <td className="px-4 py-3">
                                    <div className="text-[10px] font-black text-brand-text-primary uppercase group-hover:text-brand-blue transition-colors line-clamp-1 truncate max-w-[180px]">{r.desc}</div>
                                    <div className="text-[8px] font-mono text-brand-text-secondary opacity-60">#{r.cod}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-[9px] font-black text-brand-text-secondary uppercase">{r.filial.split(' - ')[0]}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-[11px] font-black text-brand-text-primary">{r.saldo.toLocaleString()}</div>
                                    <div className="text-[8px] font-mono text-brand-text-secondary opacity-40 uppercase">{r.un}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-[11px] font-black text-brand-red">{r.desiredQty?.toLocaleString()}</div>
                                    <div className="text-[8px] font-mono text-brand-red/50 uppercase">Sug: {r.suggestedPurchase.toLocaleString()}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className={`px-2 py-0.5 inline-block rounded text-[7px] font-black uppercase tracking-widest ${r.originReason?.includes('insuficiente') ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'}`}>
                                      {r.originReason || r.statusSignal || 'Ruptura'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button 
                                      onClick={() => removeFromCart(`${r.cod}-${r.filial}`)}
                                      className="p-1.5 bg-brand-red/10 text-brand-red rounded border border-brand-red/20 hover:bg-brand-red hover:text-white transition-all shadow-sm"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'transfers' && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-4xl mx-auto">
              {/* CARD: TRANSFERÊNCIA */}
              <div className="bg-brand-card border-2 border-brand-border rounded-[2.5rem] p-8 shadow-soft flex flex-col min-h-[600px] hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center border border-brand-green/20 shadow-lg glow-green">
                      <RefreshCcw className="w-6 h-6 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-brand-text-primary tracking-tight mb-1 uppercase">Solicitação de Transferência</h3>
                      <p className="text-[10px] text-brand-text-secondary font-black uppercase tracking-widest opacity-60">Equilíbrio de estoque entre unidades</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onExportExcel(transferItems, 'Transferencia')}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-black/20 hover:bg-brand-blue/10 rounded-xl text-[9px] font-black text-brand-text-secondary hover:text-brand-blue uppercase tracking-widest transition-all border border-brand-border/10"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> EXCEL
                    </button>
                    <button 
                      onClick={() => onExportPDF(transferItems, 'Transferencia')}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-black/20 hover:bg-brand-red/10 rounded-xl text-[9px] font-black text-brand-text-secondary hover:text-brand-red uppercase tracking-widest transition-all border border-brand-border/10"
                    >
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button 
                      onClick={onPrint}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-black/20 hover:bg-brand-purple/10 rounded-xl text-[9px] font-black text-brand-text-secondary hover:text-brand-purple uppercase tracking-widest transition-all border border-brand-border/10"
                    >
                      <Printer className="w-4 h-4" /> IMPRIMIR
                    </button>
                    {transferItems.length > 0 && (
                      <button 
                        onClick={clearCartByMode}
                        className="flex items-center gap-2 px-3 py-2 bg-brand-red/5 hover:bg-brand-red/20 rounded-xl text-[9px] font-black text-brand-red uppercase tracking-widest transition-all border border-brand-red/20 ml-2"
                      >
                        <Trash2 className="w-4 h-4" /> Limpar Todos
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-auto max-h-[700px] space-y-6 pr-2 custom-scrollbar">
                  {Object.keys(groupedTransfers).length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center p-10 text-center opacity-40">
                      <Package className="w-16 h-16 mb-4 text-brand-blue animate-pulse" />
                      <p className="text-sm font-black uppercase tracking-widest">Nenhuma transferência vinculada</p>
                      <p className="text-[10px] mt-2 max-w-[250px]">Adicione itens na aba operacional ou use a automação inteligente.</p>
                    </div>
                  ) : (
                    (Object.entries(groupedTransfers) as [string, any[]][]).map(([destBranch, items]) => (
                      <div key={destBranch} className="bg-zinc-50/50 dark:bg-white/5 border border-brand-border/30 rounded-3xl overflow-hidden hover:border-brand-blue/30 transition-all shadow-sm">
                        <div className="px-6 py-4 bg-brand-blue/5 border-b border-brand-border/30 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-blue/10 rounded-xl flex items-center justify-center border border-brand-blue/20">
                              <MapPin className="w-4 h-4 text-brand-blue" />
                            </div>
                            <div>
                              <h4 className="text-[12px] font-black text-brand-text-primary uppercase tracking-tight">Destino: {destBranch}</h4>
                              <p className="text-[9px] text-brand-text-secondary font-bold opacity-60 uppercase">{items.length} itens prontos para separação</p>
                            </div>
                          </div>
                          <TransferStatusBadge label="Aguardando Separação" />
                        </div>
                        
                        <div className="p-4">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10">Item</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center">Origem</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center">Qtd</th>
                                <th className="px-4 py-2 text-[8px] font-black uppercase tracking-widest text-brand-text-secondary border-b border-brand-border/10 text-center">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/5">
                              {items.map((r: any) => (
                                <tr key={`${r.cod}-${r.filial}`} className="hover:bg-brand-hover/40 transition-colors group">
                                  <td className="px-4 py-3">
                                    <div className="text-[10px] font-black text-brand-text-primary uppercase group-hover:text-brand-blue transition-colors line-clamp-1 truncate max-w-[200px]">{r.desc}</div>
                                    <div className="text-[8px] font-mono text-brand-text-secondary opacity-60">#{r.cod}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button 
                                      onClick={() => {
                                        const originalItem = cartItems[`${r.cod}-${r.filial}`]?.item || r;
                                        setTransferSelection({ item: originalItem, qty: r.desiredQty });
                                      }}
                                      className="px-2 py-0.5 bg-brand-green/10 text-brand-green text-[8px] font-black rounded border border-brand-green/20 uppercase hover:bg-brand-green hover:text-white transition-all flex items-center gap-1 mx-auto"
                                    >
                                      {r.sourceFilial} <Search className="w-2.5 h-2.5" />
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="text-[11px] font-black text-brand-blue">{r.desiredQty?.toLocaleString()}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button 
                                      onClick={() => removeFromCart(`${r.cod}-${r.filial}`)}
                                      className="p-1.5 bg-brand-red/10 text-brand-red rounded border border-brand-red/20 hover:bg-brand-red hover:text-white transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="px-6 py-3 bg-zinc-100/50 dark:bg-black/20 flex justify-end">
                            <button 
                              className="px-4 py-1.5 bg-brand-purple text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-purple/20 flex items-center gap-2"
                              onClick={() => {
                                setSeparationModal({ isOpen: true, destBranch, email: '' });
                              }}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Confirmar Separação
                            </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'strategic' && (
          <React.Fragment>
      {/* Risk & Opportunity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-brand-card/40 border border-brand-border/30 rounded-[3rem] p-10 premium-shadow relative overflow-hidden group premium-glass backdrop-blur-3xl">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-1000 transform group-hover:scale-150 rotate-12 pointer-events-none">
            <Package className="w-48 h-48 text-brand-blue" />
          </div>
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-text-secondary font-mono flex items-center gap-4">
                <div className="w-10 h-px bg-brand-blue/40" />
                DENSIDADE DE VOLUME
              </h3>
              <div className="text-[13px] font-black text-brand-text-primary tracking-tight">CONCENTRAÇÃO EM ESTOQUE</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse glow-blue" />
              <span className="text-[9px] font-black text-brand-blue uppercase tracking-[0.2em] bg-brand-blue/10 px-4 py-2 rounded-xl border border-brand-blue/20">LIVE DATA FEED</span>
            </div>
          </div>
          <div className="space-y-6 relative z-10">
            {Object.entries(data.inventoryRecords?.reduce((acc: Record<string, number>, r) => {
              const volumeEstoque = (r.saldo || 0);
              acc[r.filial] = (acc[r.filial] || 0) + volumeEstoque;
              return acc;
            }, {}) || {})
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 6)
              .map(([filial, value], i, arr) => {
                const max = Math.max(...arr.map(x => x[1] as number)) || 1;
                const isSelected = selectedFiliais.includes(filial);
                const isAnySelected = selectedFiliais.length > 0;
                const percentageOfMax = ((value as number) / max) * 100;
                
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group cursor-pointer p-4 rounded-2xl transition-all duration-500 ${isSelected ? 'bg-brand-blue/10 scale-[1.02] border border-brand-blue/20 glow-blue' : isAnySelected ? 'opacity-30 grayscale-[0.8]' : 'hover:bg-white/5 border border-transparent hover:border-white/5'}`}
                    onClick={() => onToggleFilial(filial)}
                  >
                    <div className="flex justify-between items-center mb-3 px-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black font-mono px-2 py-1 rounded-lg border-2 transition-all ${isSelected ? 'bg-brand-blue border-brand-blue shadow-lg text-white' : 'bg-brand-bg dark:bg-black/40 border-brand-border dark:border-white/5 text-brand-text-secondary'}`}>
                          #{i + 1}
                        </span>
                        <span className={`text-[13px] font-black uppercase tracking-tight transition-colors ${isSelected ? 'text-brand-blue' : 'text-brand-text-primary'}`}>
                          {cleanFilialName(filial)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[14px] font-black font-mono transition-colors ${isSelected ? 'text-brand-blue' : 'text-brand-text-primary'}`}>
                          {Math.round(value as number).toLocaleString()}
                        </span>
                        <span className="text-[9px] font-black text-brand-text-secondary opacity-40 uppercase">QTY</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-black/60 rounded-full overflow-hidden p-0.5 border border-brand-border dark:border-white/5 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentageOfMax}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full rounded-full transition-all duration-1000 ${isSelected ? 'bg-brand-blue glow-blue shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'bg-gradient-to-r from-brand-blue/20 to-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`}
                      />
                    </div>
                  </motion.div>
                );
            })}
          </div>
        </div>

        <div className="bg-brand-card/20 border border-brand-border/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all duration-1000 transform group-hover:scale-110 -rotate-6 pointer-events-none">
            <TrendingUp className="w-40 h-40 text-brand-purple" />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="space-y-1">
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-text-secondary font-mono flex items-center gap-3">
                <div className="w-8 h-px bg-brand-purple/40" />
                CAPACIDADE DE ESCOAMENTO
              </h3>
              <div className="text-xs font-black text-brand-text-primary tracking-tight">SCORE DE GIRO PREVENTIVO</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse" />
              <span className="text-[8px] font-black text-brand-purple uppercase tracking-widest bg-brand-purple/10 px-3 py-1.5 rounded-lg border border-brand-purple/20">CORTEX PREDICTION</span>
            </div>
          </div>
          <div className="space-y-4 relative z-10">
            {Object.entries(filteredData.filtered.reduce((acc: Record<string, number>, r: any) => {
              const turnoverPotential = (r.total_mov / 12) * (1 / (r.coverage + 0.1));
              acc[r.filial] = (acc[r.filial] || 0) + turnoverPotential;
              return acc;
            }, {}) || {})
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 6)
              .map(([filial, value], i, arr) => {
                const max = Math.max(...arr.map(x => x[1] as number)) || 1;
                const isSelected = selectedFiliais.includes(filial);
                const isAnySelected = selectedFiliais.length > 0;
                const percentageOfMax = ((value as number) / max) * 100;
                
                return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`group cursor-pointer p-4 rounded-2xl transition-all duration-500 ${isSelected ? 'bg-brand-purple/10 scale-[1.02] border border-brand-purple/20 glow-purple' : isAnySelected ? 'opacity-30 grayscale-[0.8]' : 'hover:bg-white/5 border border-transparent hover:border-white/5'}`}
                    onClick={() => onToggleFilial(filial)}
                  >
                    <div className="flex justify-between items-center mb-3 px-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black font-mono px-2 py-1 rounded-lg border-2 transition-all ${isSelected ? 'bg-brand-purple border-brand-purple shadow-lg text-white' : 'bg-brand-bg dark:bg-black/40 border-brand-border dark:border-white/5 text-brand-text-secondary'}`}>
                          #{i + 1}
                        </span>
                        <span className={`text-[13px] font-black uppercase tracking-tight transition-colors ${isSelected ? 'text-brand-purple' : 'text-brand-text-primary'}`}>
                          {cleanFilialName(filial)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[14px] font-black font-mono transition-colors ${isSelected ? 'text-brand-purple' : 'text-brand-text-primary'}`}>
                          {Math.round(value as number).toLocaleString()}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-brand-purple glow-purple shadow-lg' : 'bg-brand-purple/30'}`} />
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-black/60 rounded-full overflow-hidden p-0.5 border border-brand-border dark:border-white/5 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentageOfMax}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full rounded-full transition-all duration-1000 ${isSelected ? 'bg-brand-purple glow-purple shadow-[0_0_15px_rgba(139,92,246,0.6)]' : 'bg-gradient-to-r from-brand-purple/20 to-brand-purple shadow-[0_0_10px_rgba(139,92,246,0.3)]'}`}
                      />
                    </div>
                  </motion.div>
                );
            })}
          </div>
        </div>
      </div>

      {/* Executive Summary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-brand-card/40 border border-brand-border rounded-[2.5rem] p-8 shadow-2xl premium-glass relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Activity className="w-16 h-16 text-brand-blue" />
          </div>
          <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-[0.3em] font-mono mb-8 flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
            Sincronismo de Demanda (12 Meses)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValueInventory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(v) => fmtBRLSimple(v)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: chartColors.tooltipBg, 
                    borderColor: chartColors.grid,
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    color: chartColors.tooltipText 
                  }}
                  itemStyle={{ color: chartColors.tooltipText, fontSize: '11px', fontWeight: 700 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValueInventory)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-brand-card/40 border border-brand-border rounded-[2.5rem] p-8 shadow-2xl premium-glass relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Layers className="w-16 h-16 text-brand-purple" />
          </div>
          <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-[0.3em] font-mono mb-8 flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-brand-purple" />
            Ranking de Volume por Segmento
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topGrupos} layout="vertical" margin={{ top: 0, right: 40, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartColors.grid} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  tick={{ fill: chartColors.text, fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ 
                    backgroundColor: chartColors.tooltipBg, 
                    borderColor: chartColors.grid,
                    borderRadius: '16px',
                    color: chartColors.tooltipText 
                  }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 10, 10, 0]} 
                  barSize={18}
                  onClick={(data) => setFilters.setGroup(filters.group === data.name ? '' : data.name)}
                >
                  {topGrupos.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      fillOpacity={filters.group === entry.name ? 1 : filters.group ? 0.2 : 0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </React.Fragment>
      )}

              {viewMode === 'standard' && (
                <>
                  {viewType === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-6 bg-brand-bg">
                  {actionFilteredData.map((r_raw: any, idx: number) => {
                    const r = r_raw;
                    const isCritical = r.statusSignal === 'RUPTURA' || (r.curva === 'A' && r.coverage < 1);
                    const s = r.statusSignal;
                    const label = CRIT_LABELS[s] || s;
                    const color = CRIT_COLORS[s] || '#cbd5e1';
                    
                    // Determine logic-based action labels
                    const needsPurchase = r.saldo <= 0 && r.total_mov > 5;
                    const isTransferable = r.saldo <= 0 && transferableMap[r.cod]?.some(opt => opt.filial !== r.filial.split(' - ')[0] && opt.saldo > 0);
                    const isDeadStock = r.saldo > 0 && r.total_mov === 0;
                    const isExcess = r.statusSignal === 'ESTOQUE_ALTO';

                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: (idx % 12) * 0.02 }}
                        key={`${r.cod}-${r.filial}`} 
                        onClick={() => setSelectedItem(r)}
                        className="group relative bg-white dark:bg-zinc-900 border border-brand-border/50 rounded-3xl overflow-hidden hover:border-brand-blue/30 transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-2xl hover:shadow-brand-blue/5 flex flex-col h-full"
                      >
                        {/* Status Bar at the top */}
                        <div className="h-1.5 w-full flex">
                          <div className="h-full flex-1" style={{ backgroundColor: color }} />
                          <div className="h-full w-24 bg-zinc-100 dark:bg-white/5" />
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] tracking-widest transition-all ${
                                  r.curva === 'A' ? 'bg-brand-purple/10 text-brand-purple border border-brand-purple/20' :
                                  r.curva === 'B' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' :
                                  'bg-zinc-100 dark:bg-white/5 text-brand-text-secondary border border-brand-border/50'
                                }`}>
                                  CURVA {r.curva}
                                </span>
                                <span className="font-mono text-[9px] text-brand-text-secondary font-medium opacity-40">
                                  #{r.cod}
                                </span>
                              </div>
                              <h4 className="text-[14px] font-bold text-brand-text-primary leading-snug line-clamp-2 h-[40px] group-hover:text-brand-blue transition-colors">
                                {r.desc}
                              </h4>
                            </div>
                            
                            <div 
                              className="shrink-0 flex flex-col items-end"
                            >
                              <StatusPill status={r.statusSignal} theme={theme} />
                              <span className="text-[8px] font-black text-brand-text-secondary uppercase tracking-tighter opacity-40 mt-1">
                                {cleanFilialName(r.filial)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-brand-border/50 flex flex-col relative overflow-hidden group/item">
                              <div className="absolute top-0 right-0 w-8 h-8 bg-brand-text-secondary/5 -mr-4 -mt-4 rounded-full group-hover/item:scale-150 transition-transform" />
                              <span className="text-[8px] font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5 opacity-60">Saldo Atual</span>
                              <div className="flex items-baseline gap-1 relative z-10">
                                <span className={`text-[18px] font-black tracking-tighter ${r.saldo <= 0 ? 'text-brand-red' : 'text-brand-text-primary'}`}>
                                  {r.saldo.toLocaleString()}
                                </span>
                                <span className="text-[9px] font-medium text-brand-text-secondary uppercase font-mono opacity-40">{r.un}</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-brand-border/50 flex flex-col relative overflow-hidden group/item">
                              <div className="absolute top-0 right-0 w-8 h-8 bg-brand-blue/5 -mr-4 -mt-4 rounded-full group-hover/item:scale-150 transition-transform" />
                              <span className="text-[8px] font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5 opacity-60">Movim. 12M</span>
                              <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-[18px] font-black tracking-tighter text-brand-blue">
                                  {Math.round(r.total_mov).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Badges */}
                          <div className="flex flex-wrap gap-2 mb-6">
                            {needsPurchase && (
                              <div className="flex items-center gap-1.5 bg-brand-orange/5 text-brand-orange text-[8px] font-black px-2.5 py-1 rounded-lg uppercase border border-brand-orange/10">
                                <div className="w-1 h-1 rounded-full bg-brand-orange animate-pulse" />
                                <ShoppingCart className="w-3 h-3" /> Compra
                              </div>
                            )}
                            {isTransferable && (
                              <div className="flex items-center gap-1.5 bg-brand-green/5 text-brand-green text-[8px] font-black px-2.5 py-1 rounded-lg uppercase border border-brand-green/10">
                                <div className="w-1 h-1 rounded-full bg-brand-green animate-pulse" />
                                <ArrowRightLeft className="w-3 h-3" /> Transferência
                              </div>
                            )}
                            {isDeadStock && (
                              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-white/5 text-brand-text-secondary text-[8px] font-black px-2.5 py-1 rounded-lg uppercase border border-brand-border/50">
                                <Ghost className="w-3 h-3" /> Estoque Parado
                              </div>
                            )}
                            {isExcess && (
                              <div className="flex items-center gap-1.5 bg-brand-purple/5 text-brand-purple text-[8px] font-black px-2.5 py-1 rounded-lg uppercase border border-brand-purple/10">
                                <TrendingDown className="w-3 h-3" /> Excesso
                              </div>
                            )}
                          </div>

                          {/* Transfer Section if available */}
                          {(transferableMap[r.cod] || []).filter(opt => opt.filial !== r.filial.split(' - ')[0] && opt.saldo > 0).length > 0 && (
                            <div className="mb-6">
                              <span className="text-[8px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] mb-3 block opacity-50">Transferir de:</span>
                              <div className="flex flex-wrap gap-2">
                                {(transferableMap[r.cod] || [])
                                  .filter(opt => opt.filial !== r.filial.split(' - ')[0] && opt.saldo > 0)
                                  .slice(0, 4)
                                  .map((opt, i) => {
                                    const isSelected = cartItems[`${r.cod}-${r.filial}`]?.sourceFilial === opt.filial;
                                    return (
                                      <button 
                                        key={i} 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addToCart(r, desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase, opt.filial);
                                        }}
                                        className={`px-2.5 py-1.5 text-[8px] font-bold rounded-xl border transition-all flex items-center gap-2 group/btn ${
                                          isSelected 
                                            ? 'bg-brand-green text-white border-brand-green shadow-md shadow-brand-green/20' 
                                            : opt.total_mov === 0 
                                              ? 'bg-brand-green/5 text-brand-green border-brand-green/10 hover:bg-brand-green hover:text-white' 
                                              : 'bg-zinc-100 dark:bg-white/5 text-brand-text-primary border-brand-border hover:border-brand-blue hover:text-brand-blue'
                                        }`}
                                      >
                                        <span className="tracking-tight">{opt.filial}</span>
                                        <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : opt.total_mov === 0 ? 'bg-brand-green' : 'bg-brand-blue'}`} />
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Footer */}
                        <div className="px-6 py-4 bg-zinc-50 dark:bg-black/20 border-t border-brand-border/50 flex items-center justify-between gap-4 mt-auto" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-bold text-brand-text-secondary uppercase tracking-widest opacity-60">Qtd.</span>
                            <div className="relative group/input">
                              <input 
                                type="number"
                                className="w-[84px] bg-zinc-50 dark:bg-zinc-800 border-2 border-brand-border rounded-xl px-3 py-1.5 text-[12px] font-black text-brand-text-primary dark:text-white focus:border-brand-blue outline-none transition-all shadow-sm"
                                value={desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase}
                                onChange={(e) => setDesiredQtys({
                                  ...desiredQtys,
                                  [`${r.cod}-${r.filial}`]: parseInt(e.target.value) || 0
                                })}
                              />
                            </div>
                          </div>

                          {cartItems[`${r.cod}-${r.filial}`] ? (
                            <button 
                              className="flex-1 bg-brand-red text-white h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-red/20"
                              onClick={() => removeFromCart(`${r.cod}-${r.filial}`)}
                            >
                              <X className="w-4 h-4" /> Remover
                            </button>
                          ) : (
                            <button 
                              className="flex-1 bg-brand-blue text-white h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
                              onClick={() => addToCart(r, desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase)}
                            >
                              <ShoppingCart className="w-4 h-4" /> Adicionar
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto p-4 bg-black/[0.02]">
                  <table className="w-full text-left text-xs border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-black/5 dark:bg-white/5">
                          <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Cód</th>
                          <th className="px-6 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Item / Descrição</th>
                          {filters.criterio === 'TRANSFERENCIA' ? (
                            <>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Filial Origem</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Saldo Origem</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Filial Destino</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Saldo Destino</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Qtd. Recomendada</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Qtd. Desejada</th>
                              <th className="px-6 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Status / Justificativa</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Filial</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Saldo</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Mvto 12M</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Méd. Mes</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Curva</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Status</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-right font-mono">Disponível Tranf.</th>
                              <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center font-mono">Qtd. Desejada</th>
                              <th className="px-6 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary font-mono">Onde Encontrar / Seleção</th>
                            </>
                          )}
                          <th className="px-4 py-4 border-b border-brand-border text-[9px] uppercase font-black tracking-widest text-brand-text-secondary text-center whitespace-nowrap font-mono">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {actionFilteredData.map((r: any) => {
                          const color = CRIT_COLORS[r.statusSignal] || '#cbd5e1';
                          
                          // Clean filial name
                          const cleanFilial = cleanFilialName(r.filial);

                          // Get transfer options (excluding current filial)
                          const others = (transferableMap[r.cod] || [])
                            .filter(opt => opt.filial !== r.filial.split(' - ')[0] && opt.saldo > 0);
                          
                          const totalOthers = others.reduce((acc, curr) => acc + curr.saldo, 0);

                          return (
                            <tr 
                              key={`${r.cod}-${r.filial}`} 
                              onClick={() => setSelectedItem(r)}
                              className="hover:bg-brand-blue/[0.03] transition-all cursor-pointer group"
                            >
                                <td className="px-4 py-3">
                                  <div className="text-[10px] font-black text-brand-blue font-mono">#{r.cod}</div>
                                </td>
                                <td className="px-6 py-3">
                                  <div className="text-[11px] font-black text-brand-text-primary group-hover:text-brand-blue transition-colors line-clamp-1 truncate max-w-[250px]">{r.desc}</div>
                                </td>
                                {filters.criterio === 'TRANSFERENCIA' ? (
                                  <>
                                    <td className="px-4 py-3 text-center">
                                      <div className="text-[9px] font-black text-brand-text-primary uppercase tracking-tight">
                                        {r.transferDirection === 'SAIDA' ? cleanFilial : r.transferIdealFilial}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-black text-[11px] text-brand-text-primary">
                                        {r.transferDirection === 'SAIDA' ? r.saldo.toLocaleString() : (r.totalNetworkSurplus.toLocaleString())}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="text-[9px] font-black text-brand-blue uppercase tracking-tight">
                                        {r.transferDirection === 'SAIDA' ? r.transferIdealFilial : cleanFilial}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-black text-[11px] text-brand-text-primary">
                                        {r.saldoDestino.toLocaleString()}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="px-2 py-1 bg-brand-orange/10 text-brand-orange text-[11px] font-black rounded border border-brand-orange/20">
                                        {r.recommendedTransferQty}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input 
                                        type="number"
                                        className="w-16 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-border rounded-lg px-2 py-1 text-[11px] font-black text-center text-brand-text-primary dark:text-white focus:border-brand-blue outline-none shadow-inner"
                                        value={desiredQtys[`${r.cod}-${r.filial}`] ?? r.recommendedTransferQty}
                                        onChange={(e) => setDesiredQtys({
                                          ...desiredQtys,
                                          [`${r.cod}-${r.filial}`]: parseInt(e.target.value) || 0
                                        })}
                                      />
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="space-y-1.5 leading-tight">
                                        <TransferStatusBadge label={r.transferStatusLabel} />
                                        <div className="text-[10px] font-semibold text-brand-text-secondary italic max-w-[200px]">
                                          {r.transferJustification}
                                        </div>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3">
                                      <div className="text-[9px] font-black text-brand-text-primary uppercase tracking-tight group-hover:text-brand-blue transition-colors">
                                        {cleanFilial}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className={`font-black text-[11px] ${r.saldo <= 0 ? 'text-brand-red' : 'text-brand-text-primary'}`}>{r.saldo.toLocaleString()}</span>
                                      <span className="ml-1 text-[7px] font-black text-brand-text-secondary opacity-50 uppercase font-mono">{r.un}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-brand-text-primary/80">{Math.round(r.total_mov).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-black text-brand-blue">{(r.total_mov / 12).toFixed(1)}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                                          r.curva === 'A' ? 'bg-brand-purple/10 text-brand-purple border border-brand-purple/20' :
                                          r.curva === 'B' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' :
                                          'bg-brand-bg border border-brand-border text-brand-text-secondary'
                                      }`}>{r.curva}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <StatusPill status={r.statusSignal} theme={theme} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className={`font-black text-[11px] ${r.transferBalance > 0 ? 'text-brand-green' : 'text-brand-text-secondary opacity-20'}`}>
                                        {r.transferBalance > 0 ? r.transferBalance.toLocaleString() : '-'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input 
                                        type="number"
                                        className="w-16 bg-zinc-100 dark:bg-zinc-800 border-2 border-brand-border rounded-lg px-2 py-1 text-[11px] font-black text-center text-brand-text-primary dark:text-white focus:border-brand-blue outline-none shadow-inner"
                                        value={desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase}
                                        onChange={(e) => setDesiredQtys({
                                          ...desiredQtys,
                                          [`${r.cod}-${r.filial}`]: parseInt(e.target.value) || 0
                                        })}
                                      />
                                    </td>
                                    <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                      {others.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                                          {others.filter(o => o.saldo > 0).map((o, idx) => {
                                            const isSelected = cartItems[`${r.cod}-${r.filial}`]?.sourceFilial === o.filial;
                                            return (
                                              <button 
                                                key={idx} 
                                                onClick={() => {
                                                  addToCart(r, desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase, o.filial);
                                                }}
                                                className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase transition-all border ${
                                                  isSelected 
                                                  ? 'bg-brand-green text-white border-brand-green shadow-sm scale-110 z-10' 
                                                  : o.total_mov === 0
                                                    ? 'bg-brand-green/10 text-brand-green border-brand-green/20 hover:bg-brand-green/20'
                                                    : 'bg-brand-blue/5 text-brand-blue border-brand-blue/10 hover:bg-brand-blue/10'
                                                }`}
                                                title={`Saldo: ${o.saldo} • Mov 12M: ${o.total_mov}`}
                                              >
                                                {cleanFilialName(o.filial)} {o.total_mov === 0 && '• SM'}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-[7px] font-black text-brand-text-secondary opacity-20 uppercase">Sem saldo na rede</span>
                                      )}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  {cartItems[`${r.cod}-${r.filial}`] ? (
                                    <button 
                                      onClick={() => removeFromCart(`${r.cod}-${r.filial}`)}
                                      className="p-1.5 bg-brand-red/10 text-brand-red rounded border border-brand-red/20 hover:bg-brand-red hover:text-white transition-all"
                                      title="Remover do carrinho"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => addToCart(r, desiredQtys[`${r.cod}-${r.filial}`] ?? r.suggestedPurchase)}
                                      className="p-1.5 bg-brand-blue/10 text-brand-blue rounded border border-brand-blue/20 hover:bg-brand-blue hover:text-white transition-all"
                                      title="Adicionar ao carrinho"
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                            </tr>
                          );
                        })}
                      </tbody>
                  </table>
                </div>
              )}

              <div className="p-6 border-t border-brand-border bg-zinc-50 dark:bg-black/40 backdrop-blur-3xl flex justify-between items-center">
                <div className="text-[9px] text-zinc-500 dark:text-brand-text-secondary font-black font-mono uppercase tracking-[0.1em]">
                  PÁGINA {page + 1} DE {Math.max(1, totalPages)}
                  <span className="mx-3 opacity-20">|</span> {filteredData.filtered.length.toLocaleString()} SKUs INDEXADOS
                </div>
                <div className="flex gap-3">
                  <button 
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-6 py-2.5 rounded-xl border border-brand-border hover:border-brand-blue hover:text-brand-blue transition-all uppercase font-black text-[9px] tracking-widest bg-white dark:bg-black/20 group shadow-sm disabled:opacity-30 overflow-hidden relative"
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      <ChevronLeft className="w-3.5 h-3.5" /> ANTERIOR
                    </div>
                  </button>
                  <button 
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-6 py-2.5 rounded-xl border border-brand-border hover:border-brand-blue hover:text-brand-blue transition-all uppercase font-black text-[9px] tracking-widest bg-white dark:bg-black/20 group shadow-sm disabled:opacity-30 overflow-hidden relative"
                  >
                    <div className="relative z-10 flex items-center gap-2">
                      PRÓXIMO <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal 
            item={selectedItem} 
            data={data} 
            onClose={() => setSelectedItem(null)} 
            theme={theme}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {separationModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-brand-card w-full max-w-md rounded-[2.5rem] border border-brand-border/20 shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-brand-purple/10 rounded-3xl flex items-center justify-center mb-6 border border-brand-purple/20 shadow-inner">
                  <Mail className="w-8 h-8 text-brand-purple" />
                </div>
                
                <h3 className="text-xl font-black text-brand-text-primary uppercase tracking-tight mb-2">Enviar para Separação</h3>
                <p className="text-sm text-brand-text-secondary mb-8">
                  Deseja confirmar a separação para <span className="font-bold text-brand-purple">{separationModal.destBranch}</span>? 
                  Informe um e-mail para envio da solicitação.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-brand-text-secondary uppercase tracking-widest ml-1 mb-2 block">E-mail de Destino</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary group-focus-within:text-brand-purple transition-colors" />
                      <input 
                        type="email"
                        placeholder="exemplo@empresa.com.br"
                        className="w-full bg-black/5 dark:bg-white/5 border border-brand-border/10 h-14 rounded-2xl pl-12 pr-6 text-sm font-bold focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all placeholder:opacity-30"
                        value={separationModal.email}
                        onChange={(e) => setSeparationModal({ ...separationModal, email: e.target.value })}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-10">
                  <button 
                    onClick={() => setSeparationModal(null)}
                    className="flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-text-secondary bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-all border border-brand-border/10"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (!separationModal.email.includes('@')) {
                        alert('Por favor, informe um e-mail válido.');
                        return;
                      }
                      alert(`Solicitação de separação enviada com sucesso para ${separationModal.destBranch} e e-mail ${separationModal.email}!`);
                      setSeparationModal(null);
                    }}
                    className="flex-1 h-12 bg-brand-purple text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-brand-purple/30 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Confirmar e Enviar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </React.Fragment>
  );
}

function FinanceDashboardView({ 
  data, 
  filteredData, 
  dashboardConfig,
  onOpenPartner,
  onOpenGroup,
  selectedFiliais,
  onToggleFilial,
  onClearFilials,
  filters,
  setFilters,
  theme
}: { 
  data: DashboardData, 
  filteredData: any, 
  dashboardConfig: any,
  onOpenPartner: (p: string) => void,
  onOpenGroup: (g: string) => void,
  selectedFiliais: string[],
  onToggleFilial: (f: string) => void,
  onClearFilials: () => void,
  filters: { group: string },
  setFilters: { setGroup: (v: string) => void },
  theme: 'light' | 'dark'
}) {
  const [activeTab, setActiveTab] = useState<'evolution' | 'distribution' | 'partners'>('evolution');
  const chartColors = useMemo(() => ({
    grid: theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)",
    text: theme === 'dark' ? "#6B7280" : "#475569",
    tooltipBg: theme === 'dark' ? "#0f1115" : "#ffffff",
    tooltipText: theme === 'dark' ? "#ffffff" : "#0f172a"
  }), [theme]);

  const kpis = [
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
      sub: 'Notas Únicas', 
      icon: ClipboardList, 
      color: 'text-brand-yellow', 
      bar: 'bg-brand-yellow',
      delta: filteredData.kpis.deltaNFs,
      deltaSuffix: ' canais'
    },
    { 
      label: 'SKUs Únicos', 
      value: filteredData.kpis.items.toLocaleString(), 
      sub: 'Códigos de material distintos', 
      icon: Package, 
      color: 'text-brand-purple', 
      bar: 'bg-brand-purple' 
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={kpi.label} 
            className="bg-brand-card border-2 border-brand-border rounded-2xl p-6 relative overflow-hidden group hover:border-brand-blue/40 transition-all shadow-soft"
          >
            <div className={`absolute left-0 top-0 w-1 h-full ${kpi.bar} opacity-60 dark:opacity-40 group-hover:opacity-100 transition-opacity`} />
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[9px] font-black uppercase tracking-[0.3em] font-mono leading-none ${kpi.color} opacity-80 dark:opacity-70`}>{kpi.label}</span>
              <div className={`p-2.5 rounded-lg ${kpi.bar}/10 border border-${kpi.bar.replace('bg-', '')}/20`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <div className="flex items-end gap-2.5">
              <div className={`text-2xl font-black tracking-tighter leading-none ${kpi.color}`}>{kpi.value}</div>
              {kpi.delta !== undefined && kpi.delta !== 0 && (
                <div className={`flex items-center text-[9px] font-black mb-0.5 px-2 py-0.5 rounded border ${kpi.delta > 0 ? 'bg-brand-green/10 text-brand-green border-brand-green/20' : 'bg-brand-red/10 text-brand-red border-brand-red/20'}`}>
                  {kpi.delta > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                  {Math.abs(kpi.delta || 0).toFixed(idx === 0 ? 1 : 0)}{kpi.deltaSuffix}
                </div>
              )}
            </div>
            <div className="text-[8px] text-brand-text-secondary font-bold tracking-widest mt-3 uppercase opacity-50 dark:opacity-30 font-mono">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Performance por Unidade - Fixed in all tabs */}
      <div className="bg-brand-container/20 border-y border-brand-border/5 py-4 premium-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-purple/5 blur-[100px] -mr-32 -mt-32 opacity-20 pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 mb-4 flex items-center justify-between gap-6 relative z-20">
            <div className="flex items-center gap-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-text-secondary font-mono flex items-center gap-2">
                <div className="w-4 h-0.5 bg-brand-purple rounded-full" />
                Performance por Unidade
              </h3>
            </div>
          </div>
          
          <div className="w-full px-6 pb-4 relative z-20">
            <div className="flex flex-wrap gap-2.5 justify-center max-w-full mx-auto">
            {data.filiais.map((f: string, idx: number) => {
              const isSelected = selectedFiliais.includes(f);
              const active = selectedFiliais.length === 0 || isSelected;
              
              return (
                <motion.div 
                  whileHover={{ y: -4, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={f} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  onClick={() => onToggleFilial(f)}
                  className={`px-6 py-4 rounded-xl border-2 transition-all cursor-pointer group flex items-center justify-center min-w-[140px] max-w-[200px] flex-1 min-h-[70px] relative overflow-hidden backdrop-blur-xl shadow-soft ${
                    isSelected 
                    ? 'bg-brand-purple shadow-[0_20px_40px_rgba(168,85,247,0.4)] border-brand-purple ring-2 ring-white/10' 
                    : 'bg-brand-card dark:bg-white/5 border-brand-border dark:border-white/10 hover:border-brand-purple/50 hover:bg-brand-hover hover:shadow-md'
                  } ${!active ? 'opacity-30 grayscale' : 'opacity-100'}`}
                >
                  <div className="relative z-10 text-center">
                    <div className={`text-[12px] font-black tracking-tighter uppercase line-clamp-1 transition-all ${isSelected ? 'text-white' : 'text-brand-text-primary dark:text-brand-text-secondary dark:group-hover:text-white'}`}>
                      {f.split(' - ')[0]}
                    </div>
                  </div>

                  {isSelected && (
                    <motion.div 
                      layoutId="glow-bg"
                      className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none" 
                    />
                  )}
                </motion.div>
              );
            })}
            </div>
          </div>
        </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-brand-card/30 p-2 rounded-3xl border border-brand-border/40 dark:border-brand-border/20 w-fit shadow-sm">
        {[
          { id: 'evolution', label: 'Evolução Mensal', icon: BarChart3 },
          { id: 'distribution', label: 'Top Categorias', icon: Box },
          { id: 'partners', label: `Principais ${dashboardConfig.partnersLabel}`, icon: Users }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
              ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 translate-y-[-2px]' 
              : 'bg-transparent text-brand-text-secondary hover:bg-brand-hover/60 hover:text-brand-text-primary'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-brand-text-secondary'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'evolution' && (
          <motion.div 
            key="evolution"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 gap-8"
          >
            {/* Main Chart */}
            <div className="bg-white dark:bg-brand-container border border-brand-border rounded-[3rem] p-6 lg:p-10 premium-shadow premium-glass relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-blue/5 blur-[100px] -mr-32 -mt-32 opacity-20 pointer-events-none" />
              <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-text-secondary font-mono flex items-center gap-4">
                    <div className="w-10 h-px bg-brand-blue/40" />
                    Evolução Mensal
                  </h3>
                  <div className="text-[13px] font-black text-brand-text-primary tracking-tight">FLUXO DE {dashboardConfig.actionLabel.toUpperCase()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse glow-blue" />
                  <span className="text-[9px] font-black text-brand-blue uppercase tracking-[0.2em] bg-brand-blue/10 px-4 py-2 rounded-xl border border-brand-blue/20">SINCRONIZAÇÃO EM TEMPO REAL</span>
                </div>
              </div>
              <div className="h-[500px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData.monthly} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="buyingGradientFinance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={dashboardConfig.actionLabel === 'Vendas' ? '#38e2a0' : '#4f7cff'} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={dashboardConfig.actionLabel === 'Vendas' ? '#38e2a0' : '#4f7cff'} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: chartColors.text, fontWeight: 900, textTransform: 'uppercase' }} 
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: chartColors.text, fontFamily: 'JetBrains Mono', fontWeight: 700 }}
                      tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip 
                      cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)', radius: 12 }}
                      contentStyle={{ 
                        backgroundColor: chartColors.tooltipBg, 
                        border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`, 
                        borderRadius: '20px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
                        backdropFilter: 'blur(12px)',
                        padding: '16px',
                        color: chartColors.tooltipText
                      }}
                      itemStyle={{ fontSize: '14px', color: chartColors.tooltipText, fontWeight: '900' }}
                      labelStyle={{ color: chartColors.text, marginBottom: '10px', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em' }}
                      formatter={(v: number) => [formatFullCurrency(v), 'Consolidado']}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="url(#buyingGradientFinance)" 
                      radius={[12, 12, 4, 4]} 
                      barSize={48}
                      animationDuration={2000}
                      className="cursor-pointer hover:filter hover:brightness-125 transition-all"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'distribution' && (
          <motion.div 
            key="distribution"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 gap-8"
          >
            {/* Top Categories List View */}
            <div className="bg-white dark:bg-brand-container border border-brand-border rounded-[3rem] p-6 lg:p-10 premium-shadow premium-glass relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-purple/5 blur-[100px] -mr-32 -mt-32 opacity-20 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text-secondary font-mono flex items-center gap-4">
                    <div className="w-10 h-px bg-brand-purple/40" />
                    DISTRIBUIÇÃO
                  </h3>
                  <div className="text-[13px] font-black text-brand-text-primary tracking-tight">TOP 15 CATEGORIAS</div>
                </div>
                <div className="p-4 bg-brand-purple/10 rounded-2xl border border-brand-purple/20 shadow-lg glow-purple">
                  <Box className="w-6 h-6 text-brand-purple" />
                </div>
              </div>

              <div className="relative z-10 overflow-hidden border border-brand-border rounded-2xl bg-white dark:bg-brand-card/20 backdrop-blur-sm shadow-sm">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-gray-50 dark:bg-brand-card/40 border-b border-brand-border">
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono w-20">RANK</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono uppercase truncate">NOME DA CATEGORIA ERP</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono text-right whitespace-nowrap">VOLUME TOTAL</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono text-center w-[250px]">REPRESENTatividade</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono text-center w-24">AÇÃO</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-brand-border opacity-95">
                          {filteredData.top15Groups.map((group: any, idx: number) => {
                             const max = filteredData.top15Groups[0].value;
                             const ratio = (group.value / max) * 100;
                             return (
                               <motion.tr 
                                 key={group.fullName}
                                 initial={{ opacity: 0, x: -10 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: idx * 0.03 }}
                                 className="group hover:bg-brand-purple/[0.04] transition-all cursor-pointer"
                                 onClick={() => onOpenGroup(group.fullName)}
                               >
                                  <td className="px-6 py-4">
                                     <span className="inline-flex items-center justify-center w-8 h-8 text-[10px] font-black font-mono text-brand-text-primary dark:text-brand-text-secondary bg-gray-100 dark:bg-brand-bg/50 rounded-lg border border-brand-border shadow-sm group-hover:bg-brand-purple group-hover:text-white group-hover:border-brand-purple transition-all duration-300">
                                       {String(idx + 1).padStart(2, '0')}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex flex-col">
                                        <div className="text-[13px] font-black text-brand-text-primary group-hover:text-brand-purple transition-colors uppercase tracking-tight line-clamp-1">
                                           {group.fullName}
                                        </div>
                                        <div className="text-[8px] font-black text-brand-text-secondary opacity-60 dark:opacity-40 uppercase tracking-widest mt-0.5 font-mono">
                                           ESTRATÉGICO • ERP_GRP_{idx + 1}
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <span className="text-[16px] font-black text-brand-text-primary group-hover:text-brand-purple transition-colors font-mono tracking-tighter">
                                        {formatCurrency(group.value)}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-4">
                                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-black/40 rounded-full overflow-hidden p-0.5 shadow-inner border border-brand-border">
                                           <motion.div 
                                             initial={{ width: 0 }}
                                             animate={{ width: `${ratio}%` }}
                                             transition={{ duration: 1.5, ease: "easeOut" }}
                                             className="h-full bg-gradient-to-r from-brand-purple/40 to-brand-purple rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)] group-hover:shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-all"
                                           />
                                        </div>
                                        <span className="text-[10px] font-black font-mono text-brand-purple w-10 text-right">{Math.round(ratio)}%</span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                     <button className="w-10 h-10 inline-flex items-center justify-center bg-brand-purple/10 text-brand-purple rounded-xl border border-brand-purple/20 group-hover:bg-brand-purple group-hover:text-white group-hover:border-brand-purple group-hover:shadow-lg group-hover:shadow-brand-purple/20 transition-all duration-300">
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                     </button>
                                  </td>
                               </motion.tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'partners' && (
          <motion.div 
            key="partners"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 gap-8"
          >
            {/* Ranking / Concentration List View */}
            <div className="bg-white dark:bg-brand-container border border-brand-border rounded-[3rem] p-6 lg:p-10 premium-shadow premium-glass relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-green/5 blur-[100px] -mr-32 -mt-32 opacity-20 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text-secondary font-mono flex items-center gap-4">
                    <div className="w-10 h-px bg-brand-green/40" />
                    RANKING E CONCENTRAÇÃO
                  </h3>
                  <div className="text-[13px] font-black text-brand-text-primary tracking-tight uppercase">PRINCIPAIS {dashboardConfig.partnersLabel}</div>
                </div>
                <div className="flex items-center gap-3 bg-brand-green/10 px-5 py-2.5 rounded-2xl border border-brand-green/20 shadow-lg glow-green">
                  <Users className="w-4 h-4 text-brand-green" />
                  <span className="text-[10px] font-black text-brand-green uppercase tracking-[0.2em]">{filteredData.topPartners.length} LÍDERES</span>
                </div>
              </div>

              <div className="relative z-10 overflow-hidden border border-brand-border rounded-2xl bg-white dark:bg-brand-card/20 backdrop-blur-sm shadow-sm">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-gray-50 dark:bg-brand-card/40 border-b border-brand-border">
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono w-20">RANK</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono uppercase truncate">NOME DO {dashboardConfig.partnersLabel}</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono text-right whitespace-nowrap">VOLUME TOTAL</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono text-center w-[250px]">REPRESENTatividade</th>
                             <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text-secondary font-mono text-center w-24">AÇÃO</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-brand-border opacity-95">
                          {filteredData.topPartners.map((partner: any, idx: number) => {
                             const max = filteredData.topPartners[0].value;
                             const ratio = (partner.value / max) * 100;
                             return (
                               <motion.tr 
                                 key={partner.name}
                                 initial={{ opacity: 0, x: -10 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: idx * 0.03 }}
                                 className="group hover:bg-brand-green/[0.04] transition-all cursor-pointer"
                                 onClick={() => onOpenPartner(partner.name)}
                               >
                                  <td className="px-6 py-4">
                                     <span className="inline-flex items-center justify-center w-8 h-8 text-[10px] font-black font-mono text-brand-text-primary dark:text-brand-text-secondary bg-gray-100 dark:bg-brand-bg/50 rounded-lg border border-brand-border shadow-sm group-hover:bg-brand-green group-hover:text-white group-hover:border-brand-green transition-all duration-300">
                                       {String(idx + 1).padStart(2, '0')}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex flex-col">
                                        <div className="text-[13px] font-black text-brand-text-primary group-hover:text-brand-green transition-colors uppercase tracking-tight line-clamp-1">
                                           {partner.name}
                                        </div>
                                        <div className="text-[8px] font-black text-brand-text-secondary opacity-60 dark:opacity-40 uppercase tracking-widest mt-0.5">
                                           ID: {(idx + 1000).toString(16).toUpperCase()} • PREPOSTO
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <span className="text-[16px] font-black text-brand-text-primary group-hover:text-brand-green transition-colors font-mono tracking-tighter">
                                        {formatCurrency(partner.value)}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-4">
                                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-black/40 rounded-full overflow-hidden p-0.5 shadow-inner border border-brand-border">
                                           <motion.div 
                                             initial={{ width: 0 }}
                                             animate={{ width: `${ratio}%` }}
                                             transition={{ duration: 1.5, ease: "easeOut" }}
                                             className="h-full bg-gradient-to-r from-brand-green/40 to-brand-green rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)] group-hover:shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all"
                                           />
                                        </div>
                                        <span className="text-[10px] font-black font-mono text-brand-green w-10 text-right">{Math.round(ratio)}%</span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                     <button className="w-10 h-10 inline-flex items-center justify-center bg-brand-green/10 text-brand-green rounded-xl border border-brand-green/20 group-hover:bg-brand-green group-hover:text-white group-hover:border-brand-green group-hover:shadow-lg group-hover:shadow-brand-green/20 transition-all duration-300">
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                     </button>
                                  </td>
                               </motion.tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cortex-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('cortex-theme', next);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [screen, setScreen] = useState<Screen>('selection');
  const [appMode, setAppMode] = useState<AppMode>('purchases');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  
  // State for file upload
  const [file1, setFile1] = useState<File | null>(null); 
  
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);
  const [filterPartner, setFilterPartner] = useState<string>('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [filterFab, setFilterFab] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCriterio, setFilterCriterio] = useState<string>('');
  const [filterABC, setFilterABC] = useState<string>('');
  const [selectedPartnerDetails, setSelectedPartnerDetails] = useState<string | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<string | null>(null);
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

  const resetToSelection = () => {
    setScreen('selection');
    setFile1(null);
    // Reset all filters
    setSelectedFiliais([]);
    setFilterPartner('');
    setFilterGroup('');
    setFilterFab('');
    setSearchTerm('');
    setFilterCriterio('');
    setFilterABC('');
    setSelectedPartnerDetails(null);
    setSelectedGroupDetails(null);
  };

  const steps = [
    'Lendo arquivo com SheetJS',
    'Detectando estrutura de ERP',
    'Filtrando transações NFE',
    'Agregando dados financeiros',
    'Finalizando visualizações'
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    
    if (e && 'dataTransfer' in e) {
      // DragEvent
      e.preventDefault();
      file = e.dataTransfer?.files?.[0];
    } else if (e) {
      // ChangeEvent
      file = (e.target as HTMLInputElement).files?.[0];
    }

    if (!file) return;

    await startProcessing([file]);
  };

  const startProcessing = async (files: File[]) => {
    setScreen('processing');
    setProcessingStep(0);

    try {
      // Process each file and merge results
      let mergedData: DashboardData | null = null;

      for (const file of files) {
        // Simulate steps for UI polish
        for (let i = 0; i < steps.length; i++) {
          setProcessingStep(i);
          await new Promise(r => setTimeout(r, 200));
        }

        const result = await processFile(file, appMode);
        
        if (!mergedData) {
          mergedData = result;
        } else {
          // Merge logic
          if (result.records) {
             mergedData.records = [...(mergedData.records || []), ...result.records];
          }
          if (result.inventoryRecords) {
             mergedData.inventoryRecords = [...(mergedData.inventoryRecords || []), ...result.inventoryRecords];
          }
          if (result.groups) mergedData.groups = [...new Set([...(mergedData.groups || []), ...result.groups])];
          if (result.fabs) mergedData.fabs = [...new Set([...(mergedData.fabs || []), ...result.fabs])];
          if (result.filiais) mergedData.filiais = [...new Set([...(mergedData.filiais || []), ...result.filiais])];
          mergedData.rowCount += result.rowCount;
        }
      }

      if (!mergedData) throw new Error("No data processed");

      setData(mergedData);
      
      // Auto-switch mode if the uploaded file contains only the opposite data type
      if (appMode === 'missing_items' && (!mergedData.inventoryRecords || mergedData.inventoryRecords.length === 0) && mergedData.records && mergedData.records.length > 0) {
        setAppMode('purchases');
      } else if (appMode !== 'missing_items' && (!mergedData.records || mergedData.records.length === 0) && mergedData.inventoryRecords && mergedData.inventoryRecords.length > 0) {
        setAppMode('missing_items');
      }

      setScreen('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setScreen('error');
    }
  };

  const onToggleFilial = (filial: string) => {
    setSelectedFiliais(prev => 
      prev.includes(filial) 
        ? prev.filter(f => f !== filial) 
        : [...prev, filial]
    );
  };

  const handleExportExcel = (items: any[], type: string) => {
    const isTrans = type === 'Transferencia';
    let dataToExport: any[] = [];

    if (isTrans) {
      const tGroups: Record<string, any[]> = {};
      items.forEach(item => {
        const source = item.sourceFilial || 'REDE';
        const dest = item.filial.split(' - ')[0];
        const key = `${source} -> ${dest}`;
        if (!tGroups[key]) tGroups[key] = [];
        tGroups[key].push(item);
      });

      Object.entries(tGroups).forEach(([groupName, groupItems]) => {
        groupItems.forEach(r => {
          dataToExport.push({
            'Agrupamento': groupName,
            'Código': r.cod,
            'Produto': r.desc,
            'Grupo': r.grupo,
            'Curva': r.curva,
            'Unidade': r.un,
            'Filial Origem': r.sourceFilial,
            'Saldo Origem': r.sourceSaldo || 0,
            'Filial Destino': r.filial.split(' - ')[0],
            'Saldo Destino': r.saldo,
            'Qtd Recomendada': r.recommendedTransferQty || 0,
            'Qtd Desejada': r.desiredQty || 0,
            'Status': r.transferStatusLabel || 'Transferível',
            'Observação': r.transferJustification || '',
            'Compra Complementar': r.transferStatusLabel?.includes('Compra') ? 'SIM' : 'NÃO'
          });
        });
      });
    } else {
      // Purchases - Agrupar por Fornecedor (r.fab)
      const pGroups: Record<string, any[]> = {};
      items.forEach(item => {
        const vendor = item.fab || 'NÃO INFORMADO';
        if (!pGroups[vendor]) pGroups[vendor] = [];
        pGroups[vendor].push(item);
      });

      Object.entries(pGroups).forEach(([vendor, groupItems]) => {
        groupItems.forEach(r => {
          dataToExport.push({
            'Fornecedor': vendor,
            'Código': r.cod,
            'Produto': r.desc,
            'Filial': r.filial.split(' - ')[0],
            'Unidade': r.un,
            'Saldo Atual': r.saldo,
            'Qtd Sugerida': r.suggestedPurchase,
            'Qtd Desejada': r.desiredQty,
            'Qtd Aprovada': r.desiredQty,
            'Origem da Necessidade': r.transferStatusLabel?.includes('Parcial') ? 'Transferência Insuficiente' : r.statusSignal || 'Ruptura',
            'Curva': r.curva,
            'Status': r.statusSignal
          });
        });
      });
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, `Cortex_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = (items: any[], type: string) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const isTrans = type === 'Transferencia';
    
    const drawHeader = () => {
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 297, 25, 'F');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text(`CORTEX - RELATÓRIO DE ${type.toUpperCase()}`, 14, 15);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`GERADO EM: ${new Date().toLocaleString()}`, 14, 21);
    };

    drawHeader();
    let currentY = 35;

    if (isTrans) {
      const tGroups: Record<string, any[]> = {};
      items.forEach(item => {
        const source = item.sourceFilial || 'REDE';
        const dest = item.filial.split(' - ')[0];
        const key = `${source} -> ${dest}`;
        if (!tGroups[key]) tGroups[key] = [];
        tGroups[key].push(item);
      });

      Object.entries(tGroups).forEach(([groupName, groupItems], index) => {
        if (currentY > 170) {
           doc.addPage();
           drawHeader();
           currentY = 35;
        }

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(groupName, 14, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 6;

        autoTable(doc, {
          startY: currentY,
          head: [['CÓD.', 'PRODUTO', 'GRUPO', 'CRV.', 'SLD. OR.', 'SLD. DE.', 'REC.', 'DES.', 'STATUS']],
          body: groupItems.map(r => [
            r.cod, 
            r.desc, 
            r.grupo,
            r.curva,
            r.sourceSaldo || 0, 
            r.saldo, 
            r.recommendedTransferQty || 0, 
            r.desiredQty || 0, 
            r.transferStatusLabel || 'OK'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 6, halign: 'center' },
          styles: { fontSize: 6, cellPadding: 1.5, halign: 'center' },
          columnStyles: { 
            0: { cellWidth: 15 },
            1: { cellWidth: 55, halign: 'left' },
            2: { cellWidth: 30, halign: 'left' },
            3: { cellWidth: 10 },
            4: { cellWidth: 15 },
            5: { cellWidth: 15 },
            6: { cellWidth: 15 },
            7: { cellWidth: 15 },
            8: { cellWidth: 25 }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      });
    } else {
      const pGroups: Record<string, any[]> = {};
      items.forEach(item => {
        const vendor = item.fab || 'NÃO INFORMADO';
        if (!pGroups[vendor]) pGroups[vendor] = [];
        pGroups[vendor].push(item);
      });

      Object.entries(pGroups).forEach(([vendor, groupItems], index) => {
        if (currentY > 170) {
           doc.addPage();
           drawHeader();
           currentY = 35;
        }

        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
        doc.text(`FORNECEDOR: ${vendor}`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 6;

        autoTable(doc, {
          startY: currentY,
          head: [['CÓD.', 'PRODUTO', 'FILIAL', 'SALDO ATUAL', 'SUGESTÃO', 'QTD. COMPRA', 'ORIGEM NECESSIDADE']],
          body: groupItems.map(r => [
            r.cod, r.desc, r.filial.split(' - ')[0], r.saldo.toLocaleString(), 
            r.suggestedPurchase.toLocaleString(), r.desiredQty?.toLocaleString(), 
            r.transferStatusLabel?.includes('Parcial') ? 'TRANSF. INSUF.' : r.statusSignal || 'RUPTURA'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
          styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
          columnStyles: { 1: { cellWidth: 90, halign: 'left' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      });
    }

    doc.save(`Cortex_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
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

  const transferableMap = useMemo(() => {
    if (!data?.inventoryRecords) return {};
    const map: Record<string, { filial: string, saldo: number, total_mov: number }[]> = {};
    for (const r of data.inventoryRecords) {
      if (r.saldoTransferivel > 0) {
        if (!map[r.cod]) map[r.cod] = [];
        map[r.cod].push({ 
          filial: r.filial.split(' - ')[0], 
          saldo: r.saldoTransferivel,
          total_mov: r.total_mov || 0
        });
      }
    }
    
    // Sort each item's options: SM (total_mov === 0) first, then by highest saldo
    Object.values(map).forEach(options => {
      options.sort((a, b) => {
        if (a.total_mov === 0 && b.total_mov !== 0) return -1;
        if (b.total_mov === 0 && a.total_mov !== 0) return 1;
        return b.saldo - a.saldo;
      });
    });

    return map;
  }, [data?.inventoryRecords]);

  const staticInventoryFilters = useMemo(() => {
    if (!data?.inventoryRecords) return { groups: [], fabs: [], filiais: [] };
    const groups = new Set<string>();
    const fabs = new Set<string>();
    const filiais = new Set<string>();
    for (const r of data.inventoryRecords) {
      if (r.grupo) groups.add(r.grupo);
      if (r.fab) fabs.add(r.fab);
      if (r.filial) filiais.add(r.filial);
    }
    return {
      groups: Array.from(groups).sort(),
      fabs: Array.from(fabs).sort(),
      filiais: Array.from(filiais).sort()
    };
  }, [data?.inventoryRecords]);

  const filteredData = useMemo(() => {
    if (!data) return null;

    if ((appMode === 'missing_items') && data.inventoryRecords) {
      const lowerSearch = searchTerm?.toLowerCase();
      
      const processedBase = [];
      const criteriaCounts = { ALL: 0, COMPRA: 0, TRANSFERENCIA: 0, URGENTE: 0, COMPRAR_JA: 0, COMPRAR_BREVE: 0, OK: 0, ESTOQUE_ALTO: 0, SEM_MOVIMENTO: 0 };
      const abcMetrics = { A: { items: 0, mov: 0 }, B: { items: 0, mov: 0 }, C: { items: 0, mov: 0 } };
      
      const metricsSummary = {
        totalSaldo: 0,
        totalMov: 0,
        totalValorRuptura: 0,
        totalCapitalExcesso: 0,
        totalSemGiroValue: 0,
        totalTransferableVolume: 0,
        stockoutHighABC: 0,
        uniqueItems: new Set<string>(),
        uniqueGroups: new Set<string>(),
        itemsInStockoutCount: new Set<string>(),
        excessCount: 0,
        semGiroCount: 0,
        filialAgg: {} as Record<string, number>,
        totalSugestaoSemestre: 0,
        totalCoverageValue: 0,
        coverageCount: 0,
        transferableCount: 0,
        lowMovCount: new Set<string>()
      };

      const filialStats: Record<string, { skus: number, stock: number, skusWithStock: number, totalMatching: number }> = {};
      data.filiais.forEach(f => filialStats[f] = { totalMatching: 0, skus: 0, stock: 0, skusWithStock: 0 });

      // Calculate currentMonthIdx once
      let lastMonthIdx = 0;
      for (let i = 11; i >= 0; i--) {
        const sum = data.inventoryRecords.slice(0, 500).reduce((acc: number, r: any) => acc + (r.meses[i] || 0), 0);
        if (sum > 0) { lastMonthIdx = i; break; }
      }
      const currentMonthIdx = (lastMonthIdx + 1) % 12;

      for (const r of data.inventoryRecords) {
        // Exclude items with no stock and no movement from intelligence
        if (r.saldo <= 0 && r.total_mov === 0) continue;

        if (filterGroup && r.grupo !== filterGroup) continue;
        if (filterFab && r.fab !== filterFab) continue;
        if (filterABC && r.curva !== filterABC) continue;
        if (lowerSearch) {
          const match = r.cod.toLowerCase().includes(lowerSearch) || 
                        r.desc.toLowerCase().includes(lowerSearch) ||
                        r.fab.toLowerCase().includes(lowerSearch) ||
                        (r.grupo || '').toLowerCase().includes(lowerSearch);
          if (!match) continue;
        }

        const avg = r.total_mov / 12;
        let last3 = 0, prev3 = 0;
        for (let i = 1; i <= 3; i++) {
          last3 += r.meses[(currentMonthIdx - i + 12) % 12] || 0;
          prev3 += r.meses[(currentMonthIdx - i - 3 + 12) % 12] || 0;
        }

        const trend = prev3 > 0 ? (last3 / prev3) - 1 : 0;
        const trendFactor = 1 + Math.max(-0.5, Math.min(0.5, trend));
        
        let totalProjected = 0;
        const projectedDemand = [];
        for (let i = 0; i < 4; i++) {
          const val = r.meses[(currentMonthIdx + i) % 12] !== undefined ? r.meses[(currentMonthIdx + i) % 12] : avg;
          const demand = avg > 0 ? (val / avg) * avg * trendFactor : avg * trendFactor;
          projectedDemand.push(demand);
          totalProjected += demand;
        }

        const targetStock = totalProjected * 1.2; 
        const minStockOrigin = avg * 2.5; // Ensure origin keeps 2.5 months of coverage
        const availableSurplus = Math.max(0, Math.floor(r.saldo - minStockOrigin));
        
        const suggestedPurchase = Math.max(0, Math.ceil(targetStock - r.saldo));
        const coverage = avg > 0 ? r.saldo / (avg * trendFactor) : (r.saldo > 0 ? 99 : 0);

        let statusSignal = 'SAUDÁVEL';
        if (r.total_mov === 0 && r.saldo > 0) statusSignal = 'SEM_MOVIMENTO';
        else if (r.total_mov === 0 && r.saldo <= 0) statusSignal = 'SEM_DEMANDA';
        else if (coverage < 0.5 && r.total_mov > 0) statusSignal = 'RUPTURA';
        else if (coverage < 1.2 && r.total_mov > 0) statusSignal = 'REPOSIÇÃO';
        else if (r.saldo > r.total_mov) statusSignal = 'EXCESSO';

        const others = (transferableMap[r.cod] || []).filter(opt => opt.filial !== r.filial.split(' - ')[0]);
        // Refine transferables based on surplus rule
        const transferables = others.map(o => ({
          ...o,
          surplus: Math.max(0, Math.floor(o.saldo - (o.total_mov / 12) * 2.5))
        })).filter(o => o.surplus > 0);
        
        const totalNetworkSurplus = transferables.reduce((acc, curr) => acc + curr.surplus, 0);
        const hasTransfer = totalNetworkSurplus > 0;
        const hasDemandElsewhere = others.some(o => o.total_mov > 0);

        let transferIdealFilial = '-';
        let recommendedTransferQty = 0;
        let transferJustification = '-';
        let transferDirection: 'ENTRADA' | 'SAIDA' | 'NENHUMA' = 'NENHUMA';
        let transferStatusLabel = '';
        let saldoDestino = 0;

        // Case 1: Need in current branch (ENTRADA)
        const isLocalNeed = (['RUPTURA', 'REPOSIÇÃO'].includes(statusSignal) || (suggestedPurchase > 0 && statusSignal === 'SAUDÁVEL')) && r.total_mov > 0;
        if (isLocalNeed && hasTransfer) {
          transferDirection = 'ENTRADA';
          const bestSource = transferables[0]; 
          transferIdealFilial = bestSource.filial;
          recommendedTransferQty = Math.min(suggestedPurchase, totalNetworkSurplus);
          
          if (recommendedTransferQty < suggestedPurchase) {
            transferStatusLabel = 'Transferência Parcial + Compra';
          } else {
            transferStatusLabel = 'Direcionado para Transferência';
          }
          
          transferJustification = recommendedTransferQty < suggestedPurchase
            ? `Necessidade: ${suggestedPurchase}. Sobra rede: ${totalNetworkSurplus}. Compra complementar: ${suggestedPurchase - totalNetworkSurplus}.`
            : `Item em ${statusSignal.toLowerCase()}. Sobra disponível na rede.`;
          
          saldoDestino = r.saldo;
        }
        // Case 2: Stagnant/Excess in current branch (SAIDA)
        else if ((statusSignal === 'SEM_MOVIMENTO' || statusSignal === 'EXCESSO') && hasDemandElsewhere && availableSurplus > 0) {
          transferDirection = 'SAIDA';
          const destinations = others.filter(o => o.total_mov > 0).sort((a, b) => b.total_mov - a.total_mov);
          const bestDest = destinations[0];
          transferIdealFilial = bestDest.filial;
          
          // Recommend moving the surplus, but limited by what the destination typically needs (4 months)
          const destNeed = Math.ceil((bestDest.total_mov / 12) * 4);
          recommendedTransferQty = Math.min(availableSurplus, destNeed);
          
          transferJustification = statusSignal === 'SEM_MOVIMENTO' 
            ? `Item sem giro local (Saldo: ${r.saldo}). Demanda em ${bestDest.filial}.`
            : `Excesso detectado (Min: ${Math.round(minStockOrigin)}). Enviando excedente para ${bestDest.filial}.`;
          
          saldoDestino = bestDest.saldo;
          transferStatusLabel = 'Redistribuição de Excedente';
        }

        const transferBalance = transferables.reduce((acc, curr) => acc + curr.surplus, 0);

        const processedItem = { 
          ...r, 
          suggestedPurchase, 
          totalProjected, 
          coverage, 
          trend, 
          statusSignal, 
          projectedDemand, 
          hasTransfer, 
          transferBalance, 
          hasDemandElsewhere,
          transferIdealFilial,
          recommendedTransferQty,
          transferJustification,
          transferDirection,
          transferStatusLabel,
          availableSurplus,
          saldoDestino,
          totalNetworkSurplus
        };

        if (filialStats[r.filial]) {
          filialStats[r.filial].totalMatching++;
          filialStats[r.filial].skus++;
          filialStats[r.filial].stock += (r.saldo || 0);
          if (r.saldo > 0) filialStats[r.filial].skusWithStock++;
        }

        const isBranchMatch = selectedFiliais.length === 0 || selectedFiliais.includes(r.filial);
        if (isBranchMatch) {
          let pass = true;
          if (filterCriterio) {
            const act = (['RUPTURA', 'REPOSIÇÃO'].includes(statusSignal) || (suggestedPurchase > 0 && statusSignal === 'SAUDÁVEL')) && r.total_mov > 0;
            if (filterCriterio === 'COMPRA') pass = act && !hasTransfer;
            else if (filterCriterio === 'TRANSFERENCIA') pass = transferDirection !== 'NENHUMA';
            else if (filterCriterio === 'URGENTE') pass = statusSignal === 'RUPTURA';
            else if (filterCriterio === 'COMPRAR_JA') pass = statusSignal === 'REPOSIÇÃO';
            else if (filterCriterio === 'COMPRAR_BREVE') pass = suggestedPurchase > 0 && statusSignal === 'SAUDÁVEL';
            else if (filterCriterio === 'OK') pass = statusSignal === 'SAUDÁVEL' && suggestedPurchase === 0;
            else if (filterCriterio === 'ESTOQUE_ALTO') pass = statusSignal === 'EXCESSO';
            else if (filterCriterio === 'SEM_MOVIMENTO') pass = statusSignal === 'SEM_MOVIMENTO';
          }
          
          if (pass) processedBase.push(processedItem);

          criteriaCounts.ALL++;
          const act = (['RUPTURA', 'REPOSIÇÃO'].includes(statusSignal) || (suggestedPurchase > 0 && statusSignal === 'SAUDÁVEL')) && r.total_mov > 0;
          if (act) { if (hasTransfer) criteriaCounts.TRANSFERENCIA++; else criteriaCounts.COMPRA++; }
          else if (transferDirection === 'SAIDA') criteriaCounts.TRANSFERENCIA++;
          if (statusSignal === 'RUPTURA') criteriaCounts.URGENTE++;
          if (statusSignal === 'REPOSIÇÃO') criteriaCounts.COMPRAR_JA++;
          if (suggestedPurchase > 0 && statusSignal === 'SAUDÁVEL') criteriaCounts.COMPRAR_BREVE++;
          if (statusSignal === 'SAUDÁVEL' && suggestedPurchase === 0) criteriaCounts.OK++;
          if (statusSignal === 'EXCESSO') criteriaCounts.ESTOQUE_ALTO++;
          if (statusSignal === 'SEM_MOVIMENTO') criteriaCounts.SEM_MOVIMENTO++;

          if (abcMetrics[r.curva as keyof typeof abcMetrics]) {
            abcMetrics[r.curva as keyof typeof abcMetrics].items++;
            abcMetrics[r.curva as keyof typeof abcMetrics].mov += r.total_mov;
          }

          metricsSummary.totalSaldo += r.saldo;
          metricsSummary.totalMov += r.total_mov;
          metricsSummary.totalValorRuptura += (r.valor_ruptura || 0);
          if (statusSignal === 'EXCESSO') { metricsSummary.totalCapitalExcesso += (r.capital_parado || 0); metricsSummary.excessCount++; }
          if (statusSignal === 'SEM_MOVIMENTO') { metricsSummary.totalSemGiroValue += (r.capital_parado || 0); metricsSummary.semGiroCount++; }
          metricsSummary.totalTransferableVolume += (r.saldoTransferivel || 0);
          metricsSummary.uniqueItems.add(r.cod);
          if (r.grupo) metricsSummary.uniqueGroups.add(r.grupo);
          metricsSummary.totalSugestaoSemestre += suggestedPurchase;
          if (coverage !== undefined) { metricsSummary.totalCoverageValue += coverage; metricsSummary.coverageCount++; }
          metricsSummary.filialAgg[r.filial] = (metricsSummary.filialAgg[r.filial] || 0) + r.saldo;
          if (r.curva === 'A' && r.saldo <= 0) metricsSummary.stockoutHighABC++;
          if (r.saldo <= 0 && r.total_mov > 0) metricsSummary.itemsInStockoutCount.add(r.cod);
          if (r.total_mov > 0 && r.total_mov < 5) metricsSummary.lowMovCount.add(r.cod);
          if (r.saldo <= 0 && hasTransfer) metricsSummary.transferableCount++;
        }
      }

      return {
        inventory: {
          filtered: processedBase,
          counts: criteriaCounts,
          critDistribution: Object.entries(criteriaCounts).filter(([n]) => !['ALL', 'COMPRA', 'TRANSFERENCIA'].includes(n)).map(([name, value]) => ({ name, value })),
          abcData: Object.entries(abcMetrics).map(([name, data]) => ({ name, items: data.items, mov: data.mov })),
          currentMonthIdx,
          transferableMap,
          filialStats,
          metrics: {
            ...metricsSummary,
            uniqueItems: metricsSummary.uniqueItems.size,
            uniqueGroups: metricsSummary.uniqueGroups.size,
            itemsInStockoutCount: metricsSummary.itemsInStockoutCount.size,
            lowMovCount: metricsSummary.lowMovCount.size,
            avgCoverage: metricsSummary.coverageCount > 0 ? metricsSummary.totalCoverageValue / metricsSummary.coverageCount : 0,
            criticalFiliaisCount: Object.keys(metricsSummary.filialAgg).length,
            totalItemsCount: metricsSummary.uniqueItems.size
          },
          availableGroups: staticInventoryFilters.groups,
          availableFabs: staticInventoryFilters.fabs,
          availableFiliais: staticInventoryFilters.filiais
        }
      };
    }

    const res = { total: 0, nfs: new Set(), partners: new Set(), totalVolume: 0, items: new Set(), partnerAgg: {} as any, groupAgg: {} as any, filialAgg: {} as any, monthly: Array.from({ length: 12 }, (_, i) => ({ name: MONTH_NAMES[i], value: 0 })) };
    (data.records || []).forEach(r => {
      const match = (selectedFiliais.length === 0 || selectedFiliais.includes(r.filial)) && 
                    (!filterPartner || r.parceiro === filterPartner) && 
                    (!filterGroup || r.grupo === filterGroup) &&
                    (!filterFab || r.fab === filterFab);
      if (match) {
        res.total += r.total;
        res.nfs.add(`${r.nf}|${r.parceiro}`);
        res.partners.add(r.parceiro);
        res.totalVolume += r.qtde;
        res.items.add(r.codItem);
        res.monthly[r.mes - 1].value += r.total;
        res.partnerAgg[r.parceiro] = (res.partnerAgg[r.parceiro] || 0) + r.total;
        const g = r.grupo || 'OUTROS';
        res.groupAgg[g] = (res.groupAgg[g] || 0) + r.total;
        res.filialAgg[r.filial] = (res.filialAgg[r.filial] || 0) + r.total;
      }
    });

    const topPartners = Object.entries(res.partnerAgg).sort((a: any, b: any) => b[1] - a[1]).slice(0, 15).map(([name, value]: any) => ({ name, value }));
    const top15Groups = Object.entries(res.groupAgg).sort((a: any, b: any) => b[1] - a[1]).slice(0, 15).map(([name, value]: any) => ({ name: name.length > 25 ? name.slice(0, 23) + '...' : name, fullName: name, value }));
    const availablePartners = [...new Set((data.records || []).map(r => r.parceiro))].sort();
    const availableGroups = [...new Set((data.records || []).map(r => r.grupo || 'OUTROS'))].sort();
    const availableFabs = [...new Set((data.records || []).filter(r => r.fab && r.fab !== 'N/I').map(r => r.fab!))].sort();

    const latestMonth = data.latestMonth || 1;
    let deltas: any = {};
    if (appMode === 'sales' || appMode === 'purchases') {
      const cRecs = (data.records || []).filter(r => r.mes === latestMonth);
      const pRecs = (data.records || []).filter(r => r.mes === latestMonth - 1);
      const cTotal = cRecs.reduce((a, r) => a + r.total, 0);
      const pTotal = pRecs.reduce((a, r) => a + r.total, 0);
      deltas.deltaTotal = pTotal > 0 ? ((cTotal - pTotal) / pTotal) * 100 : 0;
      deltas.deltaPartners = new Set(cRecs.map(r => r.parceiro)).size - new Set(pRecs.map(r => r.parceiro)).size;
      deltas.deltaNFs = new Set(cRecs.map(r => `${r.nf}|${r.parceiro}`)).size - new Set(pRecs.map(r => `${r.nf}|${r.parceiro}`)).size;
    }

    return {
      kpis: { total: res.total, nfs: res.nfs.size, partners: res.partners.size, items: res.items.size, totalVolume: res.totalVolume, ...deltas },
      latestMonthLabel: MONTH_NAMES[latestMonth - 1],
      monthly: res.monthly,
      topPartners,
      top15Groups,
      filialAgg: res.filialAgg,
      availablePartners,
      availableGroups,
      availableFabs
    };
  }, [data, appMode, filterPartner, filterGroup, filterFab, filterCriterio, filterABC, searchTerm, selectedFiliais, staticInventoryFilters, transferableMap]);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary dark:text-gray-200">
      <AnimatePresence mode="wait">
        {screen === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-screen flex flex-col items-center justify-center p-6 text-center relative"
          >
            <div className="absolute top-8 right-8">
              <button 
                onClick={toggleTheme}
                className="p-3 bg-brand-container border border-brand-border rounded-2xl text-brand-text-secondary hover:text-brand-blue hover:bg-brand-blue/5 transition-all shadow-xl premium-glass backdrop-blur-xl"
                title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
            <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-brand-blue/20">
              <LayoutDashboard className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Selecione o Dashboard</h1>
            <p className="text-brand-text-secondary max-w-md mb-12">
              Escolha qual fluxo de dados deseja analisar. O sistema adaptará os indicadores para o contexto selecionado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-6xl">
              <button 
                onClick={() => { setAppMode('purchases'); setScreen('upload'); }}
                className="group relative p-10 bg-brand-container border-2 border-brand-border rounded-[3rem] hover:border-brand-blue/50 transition-all text-left overflow-hidden shadow-soft"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-all transform group-hover:scale-150 rotate-12">
                  <ShoppingCart className="w-32 h-32" />
                </div>
                <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center mb-8 border border-brand-blue/20 shadow-lg glow-blue group-hover:scale-110 transition-transform">
                  <TrendingDown className="text-brand-blue w-8 h-8" />
                </div>
                <div className="text-[10px] font-black text-brand-blue uppercase tracking-[0.4em] mb-4 font-mono">FINANCEIRO</div>
                <h3 className="text-2xl font-black mb-3 text-brand-text-primary tracking-tight">Dashboard Compras</h3>
                <p className="text-sm text-brand-text-secondary leading-relaxed font-black">
                  Análise profunda de fornecedores, redução de custos e otimização do mix.
                </p>
                <div className="mt-10 flex items-center text-xs font-black text-brand-blue uppercase tracking-[0.3em] gap-3">
                  INICIAR SESSÃO <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </button>

              <button 
                onClick={() => { setAppMode('missing_items'); setScreen('upload'); }}
                className="group relative p-10 bg-brand-container border-2 border-brand-border rounded-[3rem] hover:border-brand-yellow/50 transition-all text-left overflow-hidden shadow-soft"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-all transform group-hover:scale-150 rotate-12">
                  <LayoutDashboard className="w-32 h-32" />
                </div>
                <div className="w-16 h-16 bg-brand-yellow/10 rounded-2xl flex items-center justify-center mb-8 border border-brand-yellow/20 shadow-lg glow-yellow group-hover:scale-110 transition-transform">
                  <AlertCircle className="text-brand-yellow w-8 h-8" />
                </div>
                <div className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.4em] mb-4 font-mono">LOGÍSTICA</div>
                <h3 className="text-2xl font-black mb-3 text-brand-text-primary tracking-tight">Itens em Falta</h3>
                <p className="text-sm text-brand-text-secondary leading-relaxed font-black">
                  Monitoramento inteligente de ruptura, excesso e sugestão de compras.
                </p>
                <div className="mt-10 flex items-center text-xs font-black text-brand-yellow uppercase tracking-[0.3em] gap-3">
                  INICIAR SESSÃO <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </button>

              <button 
                onClick={() => { setAppMode('sales'); setScreen('upload'); }}
                className="group relative p-10 bg-brand-container border-2 border-brand-border rounded-[3rem] hover:border-brand-green/50 transition-all text-left overflow-hidden shadow-soft"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-all transform group-hover:scale-150 rotate-12">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mb-8 border border-brand-green/20 shadow-lg glow-green group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-brand-green w-8 h-8" />
                </div>
                <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.4em] mb-4 font-mono">COMERCIAL</div>
                <h3 className="text-2xl font-black mb-3 text-brand-text-primary tracking-tight">Dashboard Vendas</h3>
                <p className="text-sm text-brand-text-secondary leading-relaxed font-black">
                  Gestão estratégica de faturamento, canais e performance de produtos.
                </p>
                <div className="mt-10 flex items-center text-xs font-black text-brand-green uppercase tracking-[0.3em] gap-3">
                  INICIAR SESSÃO <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'upload' && (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="h-screen flex flex-col items-center justify-center p-6 text-center relative"
          >
            <div className="absolute top-8 right-8">
              <button 
                onClick={toggleTheme}
                className="p-3 bg-brand-container border border-brand-border rounded-2xl text-brand-text-secondary hover:text-brand-blue hover:bg-brand-blue/5 transition-all shadow-xl premium-glass backdrop-blur-xl"
                title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
            <div className={`w-16 h-16 ${dashboardConfig.barColor} rounded-2xl flex items-center justify-center mb-6 shadow-xl`}>
              <dashboardConfig.icon className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-brand-text-primary">{dashboardConfig.title}</h1>
            <p className="text-brand-text-secondary max-w-md mb-8">
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
                <Upload className="mx-auto w-10 h-10 text-brand-text-secondary group-hover:text-brand-blue transition-colors mb-4" />
                <h3 className="text-lg font-bold mb-1 text-brand-text-primary">Arraste sua planilha aqui</h3>
                <p className="text-sm text-brand-text-secondary font-medium">Formato .xlsx, .xls ou .csv</p>
              </div>

            <button 
              onClick={resetToSelection}
              className="mt-8 text-xs font-bold text-brand-text-secondary hover:text-brand-text-primary uppercase tracking-widest flex items-center gap-2"
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
            className="h-screen flex flex-col items-center justify-center p-6 relative"
          >
            <div className="absolute top-8 right-8">
              <button 
                onClick={toggleTheme}
                className="p-3 bg-brand-container border border-brand-border rounded-2xl text-brand-text-secondary hover:text-brand-blue hover:bg-brand-blue/5 transition-all shadow-xl premium-glass backdrop-blur-xl"
                title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
            <div className="w-12 h-12 border-4 border-brand-card border-t-brand-blue rounded-full animate-spin mb-8" />
            <h2 className="text-xl font-semibold mb-6">Processando dados financeiros...</h2>
            <div className="w-full max-w-sm space-y-2">
              {steps.map((step, idx) => (
                <div 
                  key={step} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      idx === processingStep 
                        ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' 
                        : idx < processingStep 
                          ? 'border-brand-green/20 text-brand-green' 
                          : 'border-brand-border text-brand-text-secondary'
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
            <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border/50">
              <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setScreen('selection')}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${dashboardConfig.barColor} rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                        <dashboardConfig.icon className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-lg font-black tracking-tight text-brand-text-primary dark:text-white leading-tight hidden xs:block">CORTEX<span className="text-brand-blue">.AI</span></h1>
                    </div>
                    
                    <div className="h-6 w-px bg-brand-border hidden md:block" />
                    
                    <div className="flex flex-col">
                      <h2 className="text-[15px] font-black text-brand-text-primary dark:text-white uppercase tracking-tighter leading-none mb-1">
                        {appMode === 'missing_items' ? 'Movimentação de Estoque' : 
                         appMode === 'purchases' ? 'Inteligência de Compras' : 'Inteligência de Vendas'}
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-brand-green rounded-full shadow-[0_0_8px_#10b981]" />
                        <p className="text-[9px] font-bold text-brand-text-secondary uppercase tracking-[0.2em] font-mono opacity-50">Enterprise Engine</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-brand-border mx-2 hidden lg:block" />

                  {/* Mode Switcher */}
                  {appMode === 'missing_items' && (
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-brand-yellow/10 border border-brand-yellow/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-brand-yellow" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow">Estoque</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Fixed Filters */}
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <select 
                        className="bg-brand-card dark:bg-zinc-800 border-2 border-brand-border rounded-xl pl-8 pr-4 py-2.5 text-[10px] font-black uppercase tracking-wider outline-none transition-all appearance-none cursor-pointer focus:ring-4 focus:ring-brand-blue/10 w-[160px] text-brand-text-primary dark:text-white shadow-soft hover:border-brand-blue/40"
                        value={filterGroup}
                        onChange={e => setFilterGroup(e.target.value)}
                      >
                        <option value="" className="text-brand-text-primary dark:text-white">Grupo: Todos</option>
                        {(appMode === 'missing_items' ? (filteredData.inventory?.availableGroups || []) : (filteredData.availableGroups || [])).map((g: string) => (
                          <option key={g} value={g} className="text-brand-text-primary dark:text-white">{g}</option>
                        ))}
                      </select>
                      <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-secondary opacity-60 group-focus-within:text-brand-blue transition-colors" />
                    </div>

                    {appMode === 'missing_items' && (
                    <div className="relative group">
                      <select 
                        className="bg-brand-card dark:bg-zinc-800 border-2 border-brand-border rounded-xl pl-8 pr-4 py-2.5 text-[10px] font-black uppercase tracking-wider outline-none transition-all appearance-none cursor-pointer focus:ring-4 focus:ring-brand-blue/10 w-[160px] text-brand-text-primary dark:text-white shadow-soft hover:border-brand-blue/40"
                        value={filterFab}
                        onChange={e => setFilterFab(e.target.value)}
                      >
                        <option value="" className="text-brand-text-primary dark:text-white">Marca: Todos</option>
                        {(appMode === 'missing_items' ? (filteredData.inventory?.availableFabs || []) : (filteredData.availableFabs || [])).map((f: string) => (
                          <option key={f} value={f} className="text-brand-text-primary dark:text-white">{f}</option>
                        ))}
                      </select>
                      <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-secondary opacity-60 group-focus-within:text-brand-blue transition-colors" />
                    </div>
                    )}

                    {appMode === 'missing_items' && (
                    <div className="relative group">
                      <select 
                        className="bg-brand-card dark:bg-zinc-800 border-2 border-brand-border rounded-xl pl-8 pr-4 py-2.5 text-[10px] font-black uppercase tracking-wider outline-none transition-all appearance-none cursor-pointer focus:ring-4 focus:ring-brand-blue/10 w-[120px] text-brand-text-primary dark:text-white shadow-soft hover:border-brand-blue/40"
                        value={filterABC}
                        onChange={e => setFilterABC(e.target.value)}
                      >
                        <option value="" className="text-brand-text-primary dark:text-white">Curva: Todas</option>
                        {['A', 'B', 'C'].map((abc) => (
                          <option key={abc} value={abc} className="text-brand-text-primary dark:text-white">Curva {abc}</option>
                        ))}
                      </select>
                      <PieChart className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text-secondary opacity-60 group-focus-within:text-brand-blue transition-colors" />
                    </div>
                    )}
                  </div>

                  <div className="h-8 w-px bg-white/10 mx-1 hidden xl:block" />

                  <div className="relative group">
                    <input 
                      type="text"
                      placeholder="Buscar código ou descrição..."
                      className="bg-white dark:bg-zinc-800/50 border-2 border-brand-border rounded-xl px-10 py-2.5 text-[11px] font-black w-[280px] focus:w-[350px] focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue/50 outline-none transition-all placeholder:text-brand-text-secondary/50 text-brand-text-primary dark:text-white shadow-soft hover:border-brand-blue/20"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary opacity-50 group-focus-within:text-brand-blue group-focus-within:opacity-100 transition-all" />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-brand-text-secondary" />
                      </button>
                    )}
                  </div>

                  <div className="h-8 w-px bg-brand-border mx-1 hidden lg:block" />

                  <div className="flex bg-gray-100 dark:bg-black/20 border border-brand-border rounded-xl p-0.5 gap-0.5">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${theme === 'light' ? 'bg-white text-brand-blue shadow-md' : 'text-brand-text-secondary opacity-40 hover:opacity-100'}`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Claro
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-2 rounded-lg transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-brand-blue text-white shadow-md' : 'text-brand-text-secondary opacity-40 hover:opacity-100'}`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Escuro
                    </button>
                  </div>

                  <div className="h-8 w-px bg-brand-border mx-1 hidden lg:block" />

                  <button 
                    onClick={resetToSelection}
                    className="ml-2 px-4 py-2 bg-brand-blue/10 border border-brand-blue/20 rounded-xl text-[10px] font-black text-brand-blue hover:bg-brand-blue/20 transition-all uppercase tracking-wider flex items-center gap-2"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Layout
                  </button>
                </div>
              </div>
            </header>

            <main className="p-6 max-w-[1600px] mx-auto w-full flex-1 space-y-6">
              {appMode === 'missing_items' ? (
                <InventoryDashboardView 
                  data={data} 
                  filteredData={filteredData.inventory!} 
                  selectedFiliais={selectedFiliais}
                  onToggleFilial={(f) => setSelectedFiliais(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                  onClearFilials={() => setSelectedFiliais([])}
                  theme={theme}
                  onExportExcel={handleExportExcel}
                  onExportPDF={handleExportPDF}
                  onPrint={handlePrint}
                  filters={{
                    filial: selectedFiliais.length === 1 ? selectedFiliais[0] : '',
                    group: filterGroup,
                    fab: filterFab,
                    criterio: filterCriterio,
                    search: searchTerm,
                    abc: filterABC
                  }}
                  setFilters={{
                    setFilial: (f) => f ? setSelectedFiliais([f]) : setSelectedFiliais([]),
                    setGroup: setFilterGroup,
                    setFab: setFilterFab,
                    setCriterio: setFilterCriterio,
                    setSearch: setSearchTerm,
                    setAbc: setFilterABC
                  }}
                />
              ) : (
                <FinanceDashboardView 
                  data={data} 
                  filteredData={filteredData} 
                  dashboardConfig={dashboardConfig}
                  onOpenPartner={(p) => setSelectedPartnerDetails(p)}
                  onOpenGroup={(g) => setSelectedGroupDetails(g)}
                  selectedFiliais={selectedFiliais}
                  onToggleFilial={(f) => setSelectedFiliais(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                  onClearFilials={() => setSelectedFiliais([])}
                  filters={{ group: filterGroup }}
                  setFilters={{ setGroup: setFilterGroup }}
                  theme={theme}
                />
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
                  filialName={selectedFiliais.length === 1 ? cleanFilialName(selectedFiliais[0]) : selectedFiliais.length > 1 ? `${selectedFiliais.length} Filiais` : 'Todas as Filiais'}
                  mode={appMode}
                  records={(data.records || []).filter(r => 
                    r.parceiro === selectedPartnerDetails && 
                    (selectedFiliais.length > 0 ? selectedFiliais.includes(r.filial) : true)
                  )}
                  onClose={() => setSelectedPartnerDetails(null)}
                />
              )}
              {selectedGroupDetails && (
                <GroupDetailsModal 
                  groupName={selectedGroupDetails} 
                  filialName={selectedFiliais.length === 1 ? cleanFilialName(selectedFiliais[0]) : selectedFiliais.length > 1 ? `${selectedFiliais.length} Filiais` : 'Todas as Filiais'}
                  mode={appMode}
                  records={(data.records || []).filter(r => 
                    (r.grupo || 'OUTROS') === selectedGroupDetails && 
                    (selectedFiliais.length > 0 ? selectedFiliais.includes(r.filial) : true)
                  )}
                  onClose={() => setSelectedGroupDetails(null)}
                  theme={theme}
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

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.total - a.total), [records]);

  const stats = useMemo(() => {
    const total = records.reduce((acc, r) => acc + r.total, 0);
    const nfs = [...new Set(records.map(r => `${r.nf}|${r.parceiro}`))].length;
    const items = [...new Set(records.map(r => r.codItem))].length;
    const totalQtde = records.reduce((acc, r) => acc + r.qtde, 0);
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
      value: records.filter(r => r.mes === i + 1).reduce((acc, r) => acc + r.total, 0)
    }));

    const groupsData = records.reduce((acc: Record<string, number>, r) => {
      const g = r.grupo || 'OUTROS';
      acc[g] = (acc[g] || 0) + r.total;
      return acc;
    }, {});
    
    const sortedGroups = Object.entries(groupsData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { total, nfs, items, totalQtde, monthly, groups: sortedGroups };
  }, [records]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-3xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="w-full max-w-5xl max-h-[85vh] bg-brand-container border border-brand-border/30 rounded-[2rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative z-10 flex flex-col premium-glass"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />
        
        {/* Compact Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-brand-border/20 bg-black/[0.02] dark:bg-black/20">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20 shadow-sm relative">
              <Users className="text-brand-blue w-6 h-6" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand-green rounded-full border-2 border-brand-container" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest font-mono">
                  {labels.partner.toUpperCase()}
                </span>
                <div className="h-1 w-1 rounded-full bg-brand-border" />
                <span className="text-[9px] font-black text-brand-text-secondary uppercase tracking-widest font-mono opacity-40">
                  {filialName}
                </span>
              </div>
              <h2 className="text-xl font-black text-brand-text-primary tracking-tight truncate max-w-[500px] uppercase">{partnerName}</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-brand-red/10 border border-transparent hover:border-brand-red/20 rounded-xl transition-all group"
          >
            <X className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-red" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-gradient-to-b from-white/[0.01] to-brand-bg/10">
          {/* Stats Grid - More compact */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: `Total ${labels.action}`, value: formatFullCurrency(stats.total), icon: DollarSign, color: 'text-brand-blue', bar: 'bg-brand-blue' },
              { label: 'Doc. (NF)', value: stats.nfs, icon: ClipboardList, color: 'text-brand-yellow', bar: 'bg-brand-yellow' },
              { label: 'Mix SKU', value: stats.items, icon: Package, color: 'text-brand-green', bar: 'bg-brand-green' },
              { label: 'Volume', value: stats.totalQtde.toLocaleString(), icon: Hash, color: 'text-brand-purple', bar: 'bg-brand-purple' },
            ].map((s, i) => (
               <div key={i} className="bg-brand-card/40 border border-brand-border/20 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-blue/20 transition-all shadow-sm flex flex-col justify-between">
                <div className={`absolute left-0 top-0 w-1 h-full ${s.bar} opacity-20 group-hover:opacity-60 transition-opacity`} />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[8px] text-brand-text-secondary font-black uppercase tracking-[0.2em] font-mono opacity-60">{s.label}</span>
                  <div className={`p-2 rounded-lg ${s.bar}/10 border border-${s.bar.replace('bg-', '')}/10`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                </div>
                <div className="text-xl font-black text-brand-text-primary tracking-tighter leading-none">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Historical Chart */}
            <div className="lg:col-span-8 bg-brand-card/20 p-6 rounded-[1.5rem] border border-brand-border/10 flex flex-col premium-glass min-h-[350px]">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-text-secondary font-mono flex items-center gap-4">
                    <div className="w-10 h-px bg-brand-blue/40" />
                    DESEMPENHO HISTÓRICO
                  </h3>
                </div>
              </div>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHistPartnerDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={mode === 'purchases' ? '#4f7cff' : '#38e2a0'} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={mode === 'purchases' ? '#4f7cff' : '#38e2a0'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6b7280', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#4b5563', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 18, 24, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '15px', backdropFilter: 'blur(12px)' }}
                      formatter={(v: number) => [formatFullCurrency(v), 'Total']}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="value" stroke={mode === 'purchases' ? '#4f7cff' : '#38e2a0'} fillOpacity={1} fill="url(#colorHistPartnerDetail)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Groups Breakdown */}
            <div className="lg:col-span-4 bg-brand-card/20 p-6 rounded-[1.5rem] border border-brand-border/10 premium-glass">
              <div className="space-y-1 mb-8">
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-text-secondary font-mono flex items-center gap-4">
                  <div className="w-10 h-px bg-brand-purple/40" />
                  MIX DE PRODUTOS
                </h3>
              </div>
              <div className="space-y-5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {stats.groups.map((g, i) => {
                  const max = stats.groups[0].value;
                  const ratio = (g.value / max) * 100;
                  return (
                    <div key={i} className="group cursor-default">
                      <div className="flex justify-between items-center text-[10px] mb-2">
                        <span className="truncate pr-4 font-black text-brand-text-primary uppercase tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">{g.name}</span>
                        <span className="font-mono font-black text-brand-purple text-[9px]">{formatCurrency(g.value)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-black/40 rounded-full overflow-hidden p-0.5 border border-brand-border">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${ratio}%` }}
                          className="h-full bg-brand-purple rounded-full shadow-[0_0_8px_rgba(139,92,246,0.2)] transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Records Table Overlay */}
          <div className="space-y-6 pb-10">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-text-secondary font-mono flex items-center gap-4">
                    <div className="w-10 h-px bg-brand-blue/40" />
                    RELATÓRIO ANALÍTICO
                  </h3>
                </div>
                <div className="text-[8px] text-brand-text-secondary font-mono uppercase tracking-[0.2em] bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-brand-border">
                  {records.length} REGISTROS
                </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-brand-border/30 bg-white dark:bg-brand-card/30 backdrop-blur-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-black/30 text-brand-text-secondary font-black uppercase tracking-[0.1em] border-b border-brand-border font-mono">
                      <th className="px-6 py-4">NF / DOC</th>
                      <th className="px-4 py-4">PERÍODO</th>
                      <th className="px-4 py-4">COD ITEM</th>
                      <th className="px-4 py-4">DESCRIÇÃO</th>
                      <th className="px-4 py-4">CATEGORIA</th>
                      <th className="px-4 py-4 text-right">QNT</th>
                      <th className="px-6 py-4 text-right">VALOR TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border opacity-95">
                    {sortedRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-brand-blue/[0.02] transition-colors group">
                        <td className="px-6 py-3.5">
                          <span className="font-mono font-black text-brand-blue opacity-90">{r.nf}</span>
                        </td>
                        <td className="px-4 py-3.5 text-brand-text-primary dark:text-brand-text-secondary font-black uppercase tracking-tighter">
                          {MONTH_NAMES[r.mes - 1]} / {r.ano}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-brand-text-secondary opacity-60 dark:opacity-40 font-black">{r.codItem}</td>
                        <td className="px-4 py-3.5 font-black uppercase tracking-tight line-clamp-1 opacity-90 group-hover:opacity-100 transition-opacity">
                           {r.itemDesc}
                        </td>
                        <td className="px-4 py-3.5">
                           <span className="px-2 py-0.5 bg-brand-purple/10 text-brand-purple rounded border border-brand-purple/20 text-[8px] font-black uppercase tracking-widest font-mono">
                              {r.grupo || 'OUTROS'}
                           </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-brand-text-primary">
                           {r.qtde} <span className="text-[8px] opacity-50">{r.un}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-brand-text-primary group-hover:text-brand-blue transition-colors">
                           {formatFullCurrency(r.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-gray-50 dark:bg-black/40 border-t border-brand-border flex items-center justify-center premium-glass">
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-white dark:bg-brand-container hover:bg-brand-blue/5 border border-brand-border rounded-2xl text-[11px] text-brand-text-secondary hover:text-brand-blue font-black uppercase tracking-[0.3em] transition-all shadow-lg flex items-center gap-4"
          >
            FECHAR DETALHAMENTO ANALÍTICO <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function GroupDetailsModal({ groupName, filialName, mode, records, onClose, theme }: { groupName: string, filialName: string, mode: AppMode, records: PurchaseRecord[], onClose: () => void, theme: 'light' | 'dark' }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const stats = useMemo(() => {
    const total = records.reduce((acc, r) => acc + r.total, 0);
    const nfs = new Set(records.map(r => `${r.nf}|${r.parceiro}`)).size;
    const items = new Set(records.map(r => r.itemDesc)).size;
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i],
      value: records.filter(r => r.mes === i + 1).reduce((acc, r) => acc + r.total, 0)
    }));

    const products = records.reduce((acc: Record<string, { value: number, qtde: number, un: string }>, r) => {
      if (!acc[r.itemDesc]) acc[r.itemDesc] = { value: 0, qtde: 0, un: r.un || 'UN' };
      acc[r.itemDesc].value += r.total;
      acc[r.itemDesc].qtde += r.qtde;
      return acc;
    }, {});
    
    const topProducts = Object.entries(products)
      .map(([name, data]) => ({ name, value: data.value, qtde: data.qtde, un: data.un }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    return { total, nfs, items, monthly, topProducts };
  }, [records]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="w-full max-w-5xl max-h-[85vh] bg-brand-container border border-brand-border/30 rounded-[2rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] relative z-10 flex flex-col premium-glass"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent" />
        
        {/* Compact Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-brand-border/20 bg-black/[0.02] dark:bg-black/20">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center border border-brand-purple/20 shadow-sm">
              <Package className="text-brand-purple w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className="text-[9px] font-black text-brand-purple uppercase tracking-widest font-mono">
                  CATEGORIA ERP
                </span>
                <div className="h-1 w-1 rounded-full bg-brand-border" />
                <span className="text-[9px] font-black text-brand-text-secondary uppercase tracking-widest font-mono opacity-40">
                  {filialName}
                </span>
              </div>
              <h2 className="text-xl font-black text-brand-text-primary tracking-tight truncate max-w-[500px] uppercase">{groupName}</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-brand-red/10 border border-transparent hover:border-brand-red/20 rounded-xl transition-all group"
          >
            <X className="w-5 h-5 text-brand-text-secondary group-hover:text-brand-red" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-gradient-to-b from-white/[0.01] to-brand-bg/10">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-brand-card/40 border border-brand-border/20 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
              <div className="absolute left-0 top-0 w-1 h-full bg-brand-blue opacity-40 dark:opacity-20" />
              <div className="text-[9px] font-black text-brand-text-secondary uppercase tracking-[0.2em] mb-4 opacity-80 dark:opacity-60">VOLUME TOTAL</div>
              <div className="text-2xl font-black text-brand-text-primary tracking-tighter">{formatFullCurrency(stats.total)}</div>
            </div>
            <div className="bg-white dark:bg-brand-card/40 border border-brand-border/20 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
              <div className="absolute left-0 top-0 w-1 h-full bg-brand-purple opacity-40 dark:opacity-20" />
              <div className="text-[9px] font-black text-brand-text-secondary uppercase tracking-[0.2em] mb-4 opacity-80 dark:opacity-60">FILIAL CONSOLIDADA</div>
              <div className="text-[13px] font-black text-brand-text-primary uppercase tracking-tight line-clamp-1">{filialName}</div>
            </div>
            <div className="bg-white dark:bg-brand-card/40 border border-brand-border/20 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
              <div className="absolute left-0 top-0 w-1 h-full bg-brand-green opacity-40 dark:opacity-20" />
              <div className="text-[9px] font-black text-brand-text-secondary uppercase tracking-[0.2em] mb-4 opacity-80 dark:opacity-60">DIVERSIDADE MIX</div>
              <div className="text-2xl font-black text-brand-text-primary tracking-tighter">{stats.items} SKUS</div>
            </div>
          </div>

          {/* Charts & Top Mix Area */}
          <div className="space-y-10">
            {/* Monthly Trend Chart - Full Width */}
            <div className="h-[350px] bg-white dark:bg-brand-card/20 p-8 rounded-[1.5rem] border border-brand-border/30 dark:border-brand-border/10 premium-glass shadow-sm">
              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] mb-8 text-brand-text-secondary opacity-80 dark:opacity-60 flex items-center gap-4">
                <div className="w-10 h-px bg-brand-purple/40" />
                DYNAMICS DE EVOLUÇÃO MENSAL
              </h3>
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="groupGradDetailModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ac75ff" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ac75ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme === 'dark' ? '#6b7280' : '#475569', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme === 'dark' ? '#4b5563' : '#475569', fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `R$ ${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: theme === 'dark' ? '#0f1218' : '#ffffff', border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '15px', backdropFilter: 'blur(12px)', color: theme === 'dark' ? '#ffffff' : '#0f172a' }}
                       labelStyle={{ color: theme === 'dark' ? '#94a3b8' : '#475569', fontSize: '10px', fontWeight: 'bold' }}
                       formatter={(v: number) => [formatFullCurrency(v), 'Operado']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#ac75ff" fill="url(#groupGradDetailModal)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TOP Mix List - Below Chart, Full Visibility */}
            <div className="bg-white dark:bg-brand-card/20 p-8 rounded-[1.5rem] border border-brand-border/30 dark:border-brand-border/10 premium-glass shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-text-secondary opacity-80 dark:opacity-60 flex items-center gap-4">
                  <div className="w-10 h-px bg-brand-purple/40" />
                  RANKING TOP MIX (POR VALOR E VOLUME)
                </h3>
                <span className="text-[8px] font-black text-brand-text-secondary opacity-60 dark:opacity-40 font-mono tracking-widest uppercase">Análise dos Top 15 Itens</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {stats.topProducts.map((p, i) => {
                  const maxVal = stats.topProducts[0].value;
                  const ratio = (p.value / maxVal) * 100;
                  return (
                    <div key={i} className="group cursor-default p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors border border-transparent hover:border-brand-border/20">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1 max-w-[70%]">
                           <span className="text-[12px] font-black text-brand-text-primary uppercase tracking-tight line-clamp-1 group-hover:text-brand-purple transition-colors">
                              {p.name}
                           </span>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-brand-purple font-mono">{formatCurrency(p.value)}</span>
                              <div className="w-1 h-1 rounded-full bg-brand-border" />
                              <span className="text-[9px] font-black text-brand-text-secondary opacity-60 dark:opacity-40 font-mono">
                                 {p.qtde.toLocaleString()} <span className="text-[7px] uppercase">{p.un}</span>
                              </span>
                           </div>
                        </div>
                        <span className="text-[10px] font-black font-mono text-brand-text-secondary opacity-30 dark:opacity-20">#{String(i+1).padStart(2, '0')}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-black/40 rounded-full overflow-hidden p-0.5 border border-brand-border">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${ratio}%` }}
                          transition={{ duration: 1, delay: i * 0.05 }}
                          className="h-full bg-gradient-to-r from-brand-purple/40 to-brand-purple rounded-full shadow-[0_0_8px_rgba(172,117,255,0.2)]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Records Table Overlay */}
          <div className="space-y-6 pb-10">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-text-secondary font-mono flex items-center gap-4">
                    <div className="w-10 h-px bg-brand-blue/40" />
                    RELATÓRIO ANALÍTICO ({groupName})
                  </h3>
                </div>
                <div className="text-[8px] text-brand-text-secondary font-mono uppercase tracking-[0.2em] bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-brand-border shadow-sm">
                  {records.length} REGISTROS
                </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-brand-border/30 bg-white dark:bg-brand-card/30 backdrop-blur-sm shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-black/30 text-brand-text-secondary font-black uppercase tracking-[0.1em] border-b border-brand-border font-mono">
                      <th className="px-6 py-4">NF / DOC</th>
                      <th className="px-4 py-4">PERÍODO</th>
                      <th className="px-4 py-4">COD ITEM</th>
                      <th className="px-4 py-4">DESCRIÇÃO</th>
                      <th className="px-4 py-4">FORNECEDOR</th>
                      <th className="px-4 py-4 text-right">QNT</th>
                      <th className="px-6 py-4 text-right">VALOR TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border opacity-95">
                    {[...records].sort((a, b) => b.total - a.total).map((r, i) => (
                      <tr key={i} className="hover:bg-brand-blue/[0.02] transition-colors group">
                        <td className="px-6 py-3.5">
                          <span className="font-mono font-black text-brand-blue opacity-90">{r.nf}</span>
                        </td>
                        <td className="px-4 py-3.5 text-brand-text-primary dark:text-brand-text-secondary font-black uppercase tracking-tighter">
                          {MONTH_NAMES[r.mes - 1]} / {r.ano}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-brand-text-secondary opacity-60 dark:opacity-40 font-black">{r.codItem}</td>
                        <td className="px-4 py-3.5 font-black uppercase tracking-tight line-clamp-1 opacity-90 group-hover:opacity-100 transition-opacity">
                           {r.itemDesc}
                        </td>
                        <td className="px-4 py-3.5">
                           <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded border border-brand-blue/20 text-[8px] font-black uppercase tracking-widest font-mono">
                              {r.parceiro}
                           </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-brand-text-primary">
                           {r.qtde} <span className="text-[8px] opacity-50">{r.un}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-brand-text-primary group-hover:text-brand-blue transition-colors">
                           {formatFullCurrency(r.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-black/40 border-t border-brand-border/20 flex items-center justify-center premium-glass">
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-brand-container hover:bg-brand-blue/10 border border-brand-border/30 hover:border-brand-blue/50 rounded-2xl text-[11px] text-brand-text-secondary hover:text-brand-blue font-black uppercase tracking-[0.3em] transition-all shadow-xl flex items-center gap-4"
          >
            FECHAR DETALHAMENTO ANALÍTICO <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
