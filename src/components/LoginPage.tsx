import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogIn, ShieldAlert, BarChart3, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';

const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmailAndPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorInput, setErrorInput] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentDomain(window.location.hostname);
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorInput("Por favor, preencha todos os campos.");
      return;
    }
    setErrorInput(null);
    setUnauthorizedDomainError(false);
    setLoginLoading(true);
    try {
      await loginWithEmailAndPassword(email, password);
    } catch (err: any) {
      setErrorInput(err.message || "Erro ao realizar login. Verifique suas credenciais.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorInput(null);
    setUnauthorizedDomainError(false);
    setLoginLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      const isDomainError = 
        err?.code === 'auth/unauthorized-domain' || 
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('auth/unauthorized-domain');
      
      if (isDomainError) {
        setUnauthorizedDomainError(true);
      } else {
        setErrorInput(err?.message || "Erro ao realizar login via Google. Apenas o Admin Master possui permissão.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Carregando portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-brand-blue" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center font-sans tracking-tight">
            CORTEX DATA SYSTEM
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 text-center mt-1 font-mono uppercase tracking-widest">
            Portal de Análise & Gestão
          </p>
        </div>

        {errorInput && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold text-center"
          >
            {errorInput}
          </motion.div>
        )}

        {unauthorizedDomainError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs text-left"
          >
            <div className="font-bold flex items-center gap-2 mb-2 text-red-700 dark:text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block"></span>
              Domínio Não Autorizado no Firebase
            </div>
            <p className="text-[11px] leading-relaxed mb-3 text-zinc-600 dark:text-zinc-300">
              O Firebase Auth exige registrar os domínios da aplicação para permitir conexões OAuth do Google.
            </p>
            <div className="space-y-2 mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Como corrigir no Console do Firebase:
              </p>
              <ol className="list-decimal list-inside pl-1 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>Acesse o <strong>Firebase Console</strong> do seu projeto.</li>
                <li>Vá em <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.</li>
                <li>Clique em <strong>Add domain</strong> e adicione o domínio abaixo:</li>
              </ol>
              
              <div 
                className="mt-3 p-2 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 font-mono text-[10px] select-all break-all cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex justify-between items-center group"
                onClick={() => {
                  navigator.clipboard.writeText(currentDomain);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <span className="text-brand-blue font-bold">{currentDomain}</span>
                <span className="text-[9px] bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 rounded font-sans uppercase group-hover:bg-brand-blue group-hover:text-white transition-all">
                  {copied ? 'Copiado!' : 'Copiar'}
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-1 font-sans italic text-center">
                Dica: Clique no domínio acima para copiá-lo automaticamente.
              </p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5">
              E-mail de Acesso
            </label>
            <div className="relative">
              <input 
                type="email"
                placeholder="exemplo@empresa.com"
                required
                disabled={loginLoading}
                className="w-full h-11 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl pl-10 pr-4 text-xs font-medium outline-none focus:border-brand-blue/50 focus:bg-white dark:focus:bg-zinc-800 transition-all text-gray-900 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-widest mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input 
                type="password"
                placeholder="••••••••"
                required
                disabled={loginLoading}
                className="w-full h-11 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl pl-10 pr-4 text-xs font-medium outline-none focus:border-brand-blue/50 focus:bg-white dark:focus:bg-zinc-800 transition-all text-gray-900 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full h-11 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loginLoading ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Acessar Sistema
              </>
            )}
          </button>
        </form>

        <div className="my-6 relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-100 dark:border-zinc-800"></div>
          <span className="flex-shrink mx-4 text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Exclusivo Google para Admin Master</span>
          <div className="flex-grow border-t border-gray-100 dark:border-zinc-800"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loginLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 hover:border-brand-blue dark:hover:border-brand-blue rounded-2xl text-gray-700 dark:text-zinc-200 text-xs font-bold transition-all group disabled:opacity-50"
        >
          <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
            />
          </svg>
          Google Sign-In (Admin Master)
        </button>

        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-200">
              Apenas contas "Admin Master" podem efetuar login utilizando a autenticação do Google. Outros colaboradores devem utilizar o login e senha criados pelo Admin.
            </p>
          </div>
        </div>
      </motion.div>
      
      <p className="mt-8 text-[10px] text-gray-400 dark:text-zinc-600 font-mono tracking-widest uppercase">
        ERP CONNECTOR v2.5.0 • SECURE MODE ACTIVE
      </p>
    </div>
  );
};

export default LoginPage;
