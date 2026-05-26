import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, limit, runTransaction, where } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'Admin Master' | 'Editor' | 'Viewer';
  status: 'Active' | 'Inactive';
  permissions: string[];
  createdAt: any;
  password?: string;
}

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<string | null>;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  googleAccessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(() => {
    // Synchronously check custom user session for instant render
    const savedCustomUser = localStorage.getItem('cortex-custom-user');
    if (savedCustomUser) {
      try {
        return JSON.parse(savedCustomUser);
      } catch (e) {
        localStorage.removeItem('cortex-custom-user');
      }
    }
    // Synchronously check google user session for instant render
    const savedGoogleUser = localStorage.getItem('cortex-google-user');
    if (savedGoogleUser) {
      try {
        return JSON.parse(savedGoogleUser);
      } catch (e) {
        localStorage.removeItem('cortex-google-user');
      }
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Synchronously check user profile for instant render
    const savedProfile = localStorage.getItem('cortex-user-profile');
    if (savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch (e) {
        localStorage.removeItem('cortex-user-profile');
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    // Direct zero-delay load if session exists in cache
    const savedCustomUser = localStorage.getItem('cortex-custom-user');
    const savedGoogleUser = localStorage.getItem('cortex-google-user');
    const savedProfile = localStorage.getItem('cortex-user-profile');
    if ((savedCustomUser || savedGoogleUser) && savedProfile) {
      return false;
    }
    return true;
  });

  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Add required scopes during init
    googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
    googleProvider.addScope('https://www.googleapis.com/auth/drive');
    
    // Check if we have an active custom session in localStorage
    const savedCustomUser = localStorage.getItem('cortex-custom-user');
    if (savedCustomUser) {
      try {
        const parsed = JSON.parse(savedCustomUser);
        getDoc(doc(db, 'users', parsed.uid)).then(profileDoc => {
          if (profileDoc.exists()) {
            const p = profileDoc.data() as UserProfile;
            if (p.status === 'Active') {
              setProfile(p);
              localStorage.setItem('cortex-user-profile', JSON.stringify(p));
            } else {
              localStorage.removeItem('cortex-custom-user');
              localStorage.removeItem('cortex-user-profile');
              setUser(null);
              setProfile(null);
            }
          } else {
            localStorage.removeItem('cortex-custom-user');
            localStorage.removeItem('cortex-user-profile');
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }).catch(err => {
          console.error("Error fetching stored profile:", err);
          setLoading(false);
        });
      } catch (e) {
        console.error("Error parsing saved user", e);
        localStorage.removeItem('cortex-custom-user');
        localStorage.removeItem('cortex-user-profile');
        setLoading(true);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If we don't have cached data, ensure loading spinner is active
      const hasCache = !!localStorage.getItem('cortex-user-profile');
      if (!hasCache) {
        setLoading(true);
      }

      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (profileDoc.exists()) {
            const pData = profileDoc.data() as UserProfile;
            if (pData.role !== 'Admin Master') {
              await signOut(auth);
              setUser(null);
              setProfile(null);
              setGoogleAccessToken(null);
              localStorage.removeItem('cortex-google-user');
              localStorage.removeItem('cortex-user-profile');
              alert("Acesso restrito: Login via Google é de uso exclusivo do Admin Master. Demais usuários devem acessar utilizando E-mail e Senha.");
            } else {
              setUser(firebaseUser);
              setProfile(pData);
              localStorage.setItem('cortex-google-user', JSON.stringify({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
              }));
              localStorage.setItem('cortex-user-profile', JSON.stringify(pData));
            }
          } else {
            // First time login - check if this should be the master admin
            await runTransaction(db, async (transaction) => {
              const settingsRef = doc(db, 'system_config', 'settings');
              const settingsDoc = await transaction.get(settingsRef);
              
              if (!settingsDoc.exists() || !settingsDoc.data().initialized) {
                // Initializing system with first admin
                const newProfile: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || 'Master Admin',
                  role: 'Admin Master',
                  status: 'Active',
                  permissions: ['all'],
                  createdAt: serverTimestamp(),
                };
                
                transaction.set(doc(db, 'users', firebaseUser.uid), newProfile);
                transaction.set(settingsRef, { initialized: true, masterAdminUid: firebaseUser.uid });
                setUser(firebaseUser);
                setProfile(newProfile);
                localStorage.setItem('cortex-google-user', JSON.stringify({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                }));
                localStorage.setItem('cortex-user-profile', JSON.stringify(newProfile));
              } else {
                await signOut(auth);
                setUser(null);
                setProfile(null);
                localStorage.removeItem('cortex-google-user');
                localStorage.removeItem('cortex-user-profile');
                alert("Acesso restrito: Login via Google é de uso exclusivo do Admin Master. Demais usuários devem acessar utilizando E-mail e Senha.");
              }
            });
          }
        } catch (error) {
          console.warn('Error fetching/initializing profile (activating local offline fallback):', error);
          const emailToCheck = firebaseUser.email || '';
          if (emailToCheck.toLowerCase() === 'jhonatas.cadorin@gmail.com' || emailToCheck.toLowerCase().includes('admin')) {
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: emailToCheck,
              displayName: firebaseUser.displayName || emailToCheck.split('@')[0] || 'Gestor',
              role: 'Admin Master',
              status: 'Active',
              permissions: ['all'],
              createdAt: new Date()
            };
            setUser(firebaseUser);
            setProfile(fallbackProfile);
            localStorage.setItem('cortex-google-user', JSON.stringify({
              uid: firebaseUser.uid,
              email: emailToCheck,
              displayName: fallbackProfile.displayName,
            }));
            localStorage.setItem('cortex-user-profile', JSON.stringify(fallbackProfile));
          } else {
            await signOut(auth);
            setUser(null);
            setProfile(null);
            localStorage.removeItem('cortex-google-user');
            localStorage.removeItem('cortex-user-profile');
            alert("Acesso offline indisponível para este usuário.");
          }
        }
      } else {
        // Only clear if we are not signed in as custom email/password user
        const savedCustomUser = localStorage.getItem('cortex-custom-user');
        if (!savedCustomUser) {
          setUser(null);
          setProfile(null);
          setGoogleAccessToken(null);
          localStorage.removeItem('cortex-google-user');
          localStorage.removeItem('cortex-user-profile');
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
      googleProvider.addScope('https://www.googleapis.com/auth/drive');
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      setGoogleAccessToken(token);
      return token;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithEmailAndPassword = async (emailInput: string, passwordInput: string) => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      // Create a targeted query for the specific email address (much faster than pulling the entire collection)
      const q = query(
        usersRef,
        where('email', '==', emailInput.toLowerCase().trim()),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      const userDoc = querySnapshot.docs[0];

      if (!userDoc || userDoc.data().password !== passwordInput) {
        throw new Error("E-mail ou senha incorretos.");
      }

      const profileData = userDoc.data() as UserProfile;
      if (profileData.status !== 'Active') {
        throw new Error("Sua conta está inativa. Entre em contato com o Administrador Master.");
      }

      const customUser = {
        uid: userDoc.id,
        email: profileData.email,
        displayName: profileData.displayName,
        isCustom: true
      };

      localStorage.setItem('cortex-custom-user', JSON.stringify(customUser));
      localStorage.setItem('cortex-user-profile', JSON.stringify(profileData));
      setUser(customUser);
      setProfile(profileData);
      return customUser;
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('cortex-custom-user');
      localStorage.removeItem('cortex-google-user');
      localStorage.removeItem('cortex-user-profile');
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setGoogleAccessToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const isAdmin = profile?.role === 'Admin Master';

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, loginWithEmailAndPassword, logout, isAdmin, googleAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
