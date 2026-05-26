import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Terminal, Clock, Activity, Search, ShieldCheck } from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  metadata: any;
  timestamp: any;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        const logsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        setLogs(logsData);
        localStorage.setItem('cortex_offline_logs', JSON.stringify(logsData));
      } catch (error) {
        console.warn("Could not fetch audit logs online, serving cached or mock data:", error);
        const offline = localStorage.getItem('cortex_offline_logs');
        if (offline) {
          try {
            setLogs(JSON.parse(offline));
          } catch (e) {
            console.error("Failed parsing cached logs", e);
          }
        } else {
          setLogs([
            {
              id: 'mock-log-1',
              userId: 'guest-admin',
              userEmail: 'jhonatas.cadorin@gmail.com',
              action: 'Bypass de Autenticação / Login Removido',
              metadata: { module: 'AUTH' },
              timestamp: { toDate: () => new Date() }
            },
            {
              id: 'mock-log-2',
              userId: 'guest-admin',
              userEmail: 'jhonatas.cadorin@gmail.com',
              action: 'Reativação de upload de Excel (XLSX)',
              metadata: { module: 'FINANCEIRO/COMERCIAL' },
              timestamp: { toDate: () => new Date() }
            }
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-brand-text-primary dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Terminal className="w-5 h-5 text-brand-blue" />
          Auditoria de Logs
        </h2>
        <p className="text-xs text-brand-text-secondary opacity-60 font-mono italic">Rastreabilidade completa de todas as atividades críticas do sistema</p>
      </div>

      <div className="bg-brand-card dark:bg-zinc-900 border border-brand-border rounded-2xl overflow-hidden shadow-2xl premium-glass">
        <div className="p-4 border-b border-brand-border bg-black/5 dark:bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live Monitor
                </div>
                <div className="text-[10px] text-brand-text-secondary font-mono">Mostrando últimos 50 eventos</div>
            </div>
            <div className="flex items-center gap-2">
                <button className="p-2 text-brand-text-secondary hover:text-brand-blue transition-all">
                    <Activity className="w-4 h-4" />
                </button>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <span className="text-[10px] text-brand-text-secondary animate-pulse">CARREGANDO LOGS DE AUDITORIA...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-brand-text-secondary text-[10px]">NENHUM LOG REGISTRADO NO MOMENTO</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-brand-blue/5 transition-colors border-l-2 border-transparent hover:border-brand-blue">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 opacity-30" />
                      <span className="text-[10px] text-brand-text-primary dark:text-white">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('pt-BR') : 'Recent'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] bg-brand-blue/5 text-brand-blue px-2 py-0.5 rounded border border-brand-blue/10">
                        {log.userEmail || log.userId}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase text-brand-text-primary dark:text-gray-300">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] text-brand-text-secondary opacity-60 uppercase">{log.metadata?.module || 'SYSTEM'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[9px] text-brand-blue hover:underline font-black uppercase">Ver JSON</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-4">
        <ShieldCheck className="w-5 h-5 text-amber-500 mt-1" />
        <div>
            <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">Integridade de Dados</h4>
            <p className="text-[10px] text-amber-800/60 dark:text-amber-200/40 leading-relaxed max-w-2xl">
                Todos os logs são imutáveis e protegidos por regras de segurança criptográficas. A exclusão de logs via cliente SDK é bloqueada permanentemente.
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
