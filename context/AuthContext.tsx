import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  OAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/router';

interface AuthUser {
  uid: string;
  email: string | null;
  role: 'admin' | 'authenticated';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (providerName: 'google' | 'github' | 'microsoft') => Promise<void>;
  register: (providerName: 'google' | 'github' | 'microsoft', inviteToken: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check session status on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const getProvider = (name: 'google' | 'github' | 'microsoft') => {
    switch (name) {
      case 'google':
        return new GoogleAuthProvider();
      case 'github':
        return new GithubAuthProvider();
      case 'microsoft':
        return new OAuthProvider('microsoft.com');
    }
  };

  const login = async (providerName: 'google' | 'github' | 'microsoft') => {
    setLoading(true);
    setError(null);
    try {
      const provider = getProvider(providerName);
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errData = await res.json();
        // If not registered or authorized, sign out of Firebase Auth to keep clean state
        await signOut(auth);
        throw new Error(errData.message || 'Login failed. You might not have access.');
      }

      const data = await res.json();
      setUser(data.user);
      
      // Redirect to home or original target
      const redirectUrl = router.query.redirect as string || '/home';
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (providerName: 'google' | 'github' | 'microsoft', inviteToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const provider = getProvider(providerName);
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, token: inviteToken }),
      });

      if (!res.ok) {
        const errData = await res.json();
        await signOut(auth);
        throw new Error(errData.message || 'Registration failed.');
      }

      const data = await res.json();
      setUser(data.user);
      router.push('/home');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await signOut(auth);
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, error, setError }}>
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
