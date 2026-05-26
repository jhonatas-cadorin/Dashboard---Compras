import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { User, Shield, ShieldAlert, Trash2, Edit2, Check, X, Search, Filter, LogOut, UserPlus, Key, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'Admin Master' | 'Editor' | 'Viewer';
  status: 'Active' | 'Inactive';
  permissions: string[];
  password?: string;
}

export const UsersManagement: React.FC = () => {
  const { logout } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserProfile['role']>('Viewer');
  const [editStatus, setEditStatus] = useState<UserProfile['status']>('Active');
  const [editPassword, setEditPassword] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Show password toggle states for table
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserProfile['role']>('Viewer');
  const [newStatus, setNewStatus] = useState<UserProfile['status']>('Active');
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const path = 'users';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      const usersData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
      localStorage.setItem('cortex_offline_users', JSON.stringify(usersData));
    } catch (error) {
      console.warn("Error fetching users online, trying offline cache:", error);
      const offline = localStorage.getItem('cortex_offline_users');
      if (offline) {
        try {
          setUsers(JSON.parse(offline));
        } catch (e) {
          console.error("Failed to parse cached users:", e);
        }
      } else {
        // Fallback default list containing Admin Master
        setUsers([
          {
            uid: 'guest-admin',
            email: 'jhonatas.cadorin@gmail.com',
            displayName: 'Jhonatas Cadorin',
            role: 'Admin Master',
            status: 'Active',
            permissions: ['all']
          }
        ]);
      }
    } finally {
      setLoading(true); // wait, should be false!
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (uid: string) => {
    const path = `users/${uid}`;
    try {
      const userRef = doc(db, 'users', uid);
      const updateData: any = {
        role: editRole,
        status: editStatus,
        updatedAt: serverTimestamp()
      };
      
      if (editPassword.trim()) {
        updateData.password = editPassword.trim();
      }

      await updateDoc(userRef, updateData);
      setEditingId(null);
      setEditPassword('');
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Erro ao atualizar usuário. Verifique suas permissões.");
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDelete = async (uid: string, role: string) => {
    if (role === 'Admin Master') {
      alert("Não é possível excluir o Administrador Master.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    
    const path = `users/${uid}`;
    try {
      await deleteDoc(doc(db, 'users', uid));
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Erro ao excluir usuário.");
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newDisplayName) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setIsCreating(true);
    const usersRef = collection(db, 'users');
    try {
      // Verify duplicate
      const querySnapshot = await getDocs(usersRef);
      const emailExists = querySnapshot.docs.some(doc => {
        const d = doc.data();
        return d.email && d.email.toLowerCase().trim() === newEmail.toLowerCase().trim();
      });

      if (emailExists) {
        alert("Este e-mail já está cadastrado.");
        setIsCreating(false);
        return;
      }

      const newUserDoc = doc(usersRef);
      await setDoc(newUserDoc, {
        uid: newUserDoc.id,
        email: newEmail.toLowerCase().trim(),
        password: newPassword,
        displayName: newDisplayName,
        role: newRole,
        status: newStatus,
        permissions: newRole === 'Admin Master' ? ['all'] : [],
        createdAt: serverTimestamp()
      });

      alert("Usuário com CPF/E-mail de acesso cadastrado com sucesso!");
      // Reset form fields
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('Viewer');
      setNewStatus('Active');
      setShowAddForm(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert("Erro ao registrar usuário no Firestore: " + error.message);
      handleFirestoreError(error, OperationType.WRITE, 'users');
    } finally {
      setIsCreating(false);
    }
  };

  const togglePasswordVisibility = (uid: string) => {
    setShowPasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-text-primary dark:text-white uppercase tracking-tight font-sans">Gestão de Usuários</h2>
          <p className="text-xs text-brand-text-secondary opacity-60 font-mono italic">Controle de acessos e criação de novos usuários</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative group max-w-xs w-full min-w-[200px]">
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-white dark:bg-white border-2 border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-brand-blue/50 transition-all text-black dark:text-black font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary opacity-50" />
          </div>

          <button 
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 h-9 px-4 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-brand-blue/10 cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>

          <button 
            type="button"
            onClick={logout}
            className="flex items-center gap-2 h-9 px-4 bg-red-600/10 hover:bg-red-600 border border-red-600/20 hover:border-red-600 text-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-600/5 cursor-pointer shrink-0"
            title="Sair do Sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair do Sistema</span>
            <span className="sm:hidden">Sair</span>
          </button>
        </div>
      </div>

      {/* Accordion New User Form Panel */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-brand-card dark:bg-zinc-900 border border-brand-border rounded-2xl shadow-xl p-6"
          >
            <div className="border-b border-brand-border pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-blue" />
                <h3 className="text-sm font-black text-brand-text-primary dark:text-brand-blue uppercase tracking-widest">Cadastrar Novo Usuário</h3>
              </div>
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-1 hover:bg-brand-border rounded-lg text-brand-text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-1.5">Nome Completo</label>
                <input 
                  type="text"
                  placeholder="Ex: João da Silva"
                  required
                  className="w-full bg-white dark:bg-white border-2 border-brand-border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-blue/50 text-black dark:text-black"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-1.5">E-mail / Usuário de Acesso</label>
                <input 
                  type="email"
                  placeholder="Ex: joao@empresa.com"
                  required
                  className="w-full bg-white dark:bg-white border-2 border-brand-border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-blue/50 text-black dark:text-black"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-1.5">Senha Inicial</label>
                <input 
                  type="password"
                  placeholder="Defina a senha de acesso"
                  required
                  className="w-full bg-white dark:bg-white border-2 border-brand-border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-blue/50 text-black dark:text-black"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-1.5">Perfil de Acesso</label>
                <select 
                  className="w-full bg-white dark:bg-white border-2 border-brand-border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-blue/50 text-black dark:text-black"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="Viewer">Viewer (Visualizador)</option>
                  <option value="Editor">Editor (Gestor Operacional)</option>
                  <option value="Admin Master">Admin Master (Administrador)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-1.5">Status Inicial</label>
                <select 
                  className="w-full bg-white dark:bg-white border-2 border-brand-border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-blue/50 text-black dark:text-black"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                >
                  <option value="Active">Ativo</option>
                  <option value="Inactive">Inativo</option>
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end gap-3 mt-2 border-t border-brand-border pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border-2 border-brand-border rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 text-brand-text-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-xs font-bold tracking-wide active:scale-95 transition-all shadow-lg shadow-brand-blue/10 flex items-center gap-2"
                >
                  {isCreating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Criar Usuário
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users List Data Table */}
      <div className="bg-brand-card dark:bg-zinc-900 border border-brand-border rounded-2xl overflow-hidden shadow-xl premium-glass">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-black/5 dark:bg-white/5 animate-fade-in">
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Colaborador / Nome</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">E-mail / Cadastro</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Senha de Acesso</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Perfil de Acesso</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-brand-text-secondary uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                       <span className="text-[10px] font-mono text-brand-text-secondary uppercase animate-pulse">Sincronizando banco de dados...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-text-secondary font-mono text-[10px] uppercase">Nenhum usuário correspondente encontrado</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-brand-blue/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${user.role === 'Admin Master' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-brand-blue/10 text-brand-blue'}`}>
                        {(user.displayName || 'U').charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-brand-text-primary dark:text-white capitalize">{user.displayName || 'Sem nome'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-brand-text-secondary font-mono opacity-80">{user.email}</td>
                  
                  {/* Password access logic */}
                  <td className="px-6 py-4">
                    {editingId === user.uid ? (
                      <input 
                        type="text"
                        placeholder="Alterar senha"
                        className="bg-white dark:bg-white border-2 border-brand-border rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-blue text-black dark:text-black w-32"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {user.password ? (
                          <>
                            <span className="text-xs font-mono tracking-wider opacity-80 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-lg border border-brand-border">
                              {showPasswords[user.uid] ? user.password : '••••••••'}
                            </span>
                            <button 
                              type="button"
                              onClick={() => togglePasswordVisibility(user.uid)}
                              className="text-zinc-400 hover:text-brand-blue transition-colors p-1"
                            >
                              {showPasswords[user.uid] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-brand-text-secondary opacity-50 bg-black/5 dark:bg-white/5 border border-brand-border px-2 py-0.5 rounded-lg tracking-wider">
                            LOGIN GOOGLE
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {editingId === user.uid ? (
                      <select 
                        className="bg-white dark:bg-white border border-brand-border rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-blue text-black dark:text-black"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        disabled={user.role === 'Admin Master'}
                      >
                        <option value="Admin Master">Admin Master</option>
                        <option value="Editor">Editor</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {user.role === 'Admin Master' ? (
                          <Shield className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-brand-blue" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${user.role === 'Admin Master' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-brand-blue/10 text-brand-blue'}`}>
                          {user.role}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === user.uid ? (
                      <select 
                        className="bg-white dark:bg-white border border-brand-border rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-blue text-black dark:text-black"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                        disabled={user.role === 'Admin Master'}
                      >
                        <option value="Active">Ativo</option>
                        <option value="Inactive">Inativo</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${user.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.status === 'Active' ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === user.uid ? (
                        <>
                          <button onClick={() => handleUpdate(user.uid)} className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all cursor-pointer">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditPassword(''); }} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingId(user.uid);
                              setEditRole(user.role);
                              setEditStatus(user.status);
                              setEditPassword(user.password || '');
                            }} 
                            disabled={user.role === 'Admin Master'}
                            className="p-1.5 text-brand-text-secondary opacity-40 hover:opacity-100 hover:text-brand-blue transition-all disabled:pointer-events-none cursor-pointer"
                            title="Editar Usuário"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.uid, user.role)}
                            disabled={user.role === 'Admin Master'}
                            className="p-1.5 text-brand-text-secondary opacity-40 hover:opacity-100 hover:text-red-500 transition-all disabled:pointer-events-none cursor-pointer"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
