import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Head from 'next/head';

export default function Signup() {
  const router = useRouter();
  const { register, error, setError } = useAuth();
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  
  const token = router.query.token as string;

  useEffect(() => {
    if (!router.isReady) return;

    if (!token) {
      setTokenError('An invitation token is required to register. Please use the exact link sent by your administrator.');
      setVerifyingToken(false);
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch(`/api/auth/verify-invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        
        if (!res.ok || !data.valid) {
          setTokenError(data.message || 'The invitation token is invalid or has expired.');
        }
      } catch (err) {
        setTokenError('Could not verify invitation token. Please check your internet connection.');
      } finally {
        setVerifyingToken(false);
      }
    }

    verifyToken();
  }, [router.isReady, token]);

  const handleSignup = async (provider: 'google' | 'github' | 'microsoft') => {
    setSigningUp(provider);
    setError(null);
    try {
      await register(provider, token);
    } catch (err) {
      console.error(err);
    } finally {
      setSigningUp(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center px-4 py-12">
      <Head>
        <title>Create Account - Vault Notes</title>
      </Head>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl rounded-2xl p-8 md:p-10 text-center">
        <div className="mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm text-gray-300">
            Register to join this private vault workspace.
          </p>
        </div>

        {verifyingToken ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-300 text-sm">Verifying invitation token...</p>
          </div>
        ) : tokenError ? (
          <div className="p-5 rounded-xl bg-red-950/40 border border-red-500/30 text-left">
            <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Registration Restrained
            </h3>
            <p className="text-red-200 text-sm leading-relaxed">{tokenError}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-500/30 text-red-200 text-sm text-left">
                <p className="font-semibold">Registration failed</p>
                <p className="opacity-90">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Google Button */}
              <button
                onClick={() => handleSignup('google')}
                disabled={signingUp !== null}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {signingUp === 'google' ? (
                  <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38C16.88,15.82,14.67,17.3,12,17.3c-2.92,0-5.4-1.98-6.28-4.64C5.47,11.83,5.33,10.95,5.33,10s0.14-1.83,0.39-2.66c0.88-2.66,3.36-4.64,6.28-4.64c1.58,0,3.01,0.58,4.12,1.63L18.06,2.4C16.43,0.92,14.3,0,12,0C7.29,0,3.34,2.72,1.52,6.7C0.55,8.81,0,11.16,0,13.6c0,2.44,0.55,4.79,1.52,6.9c1.82,3.98,5.77,6.7,10.48,6.7c6,0,11-4.88,11-11C23,15.29,22.38,13.1,21.35,11.1z" fill="#4285F4"/>
                      <path d="M1.52,6.7C3.34,2.72,7.29,0,12,0c2.3,0,4.43,0.92,6.06,2.4l-2.03,2.03C15.01,3.38,13.58,2.8,12,2.8c-2.92,0-5.4,1.98-6.28,4.64c-0.25-0.83-0.39-1.71-0.39-2.66C5.33,4.78,5.47,3.9,5.72,3.07L1.52,6.7z" fill="#EA4335"/>
                      <path d="M12,20c2.67,0,4.88-1.48,5.38-3.5H12v-2.7h9.35C22.38,13.1,23,15.29,23,17c0,6.12-5,11-11,11c-4.71,0-8.66-2.72-10.48-6.7c0.25-0.83,0.39-1.71,0.39-2.66c0-0.95-0.14-1.83-0.39-2.66c0.88,2.66,3.36,4.64,6.28,4.64c1.58,0,3.01,0.58,4.12,1.63L18.06,2.4c1.63,1.48,3.76,2.4,6.06,2.4C16.23,26.62,14.53,27.2,12,27.2c-2.92,0-5.4-1.98-6.28-4.64C5.47,21.83,5.33,20.95,5.33,20s0.14-1.83,0.39-2.66c0.88-2.66,3.36-4.64,6.28-4.64c1.58,0,3.01,0.58,4.12,1.63L18.06,2.4C16.43,0.92,14.3,0,12,0z" fill="#FBBC05"/>
                      <path d="M12,27.2c-4.71,0-8.66-2.72-10.48-6.7L5.72,16.9c0.88,2.66,3.36,4.64,6.28,4.64c2.67,0,4.88-1.48,5.38-3.5H12v-2.7h9.35C22.38,13.1,23,15.29,23,17C23,23.12,18,27.2,12,27.2z" fill="#34A853"/>
                    </g>
                  </svg>
                )}
                <span>Sign up with Google</span>
              </button>

              {/* GitHub Button */}
              <button
                onClick={() => handleSignup('github')}
                disabled={signingUp !== null}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 border border-white/10 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {signingUp === 'github' ? (
                  <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
                <span>Sign up with GitHub</span>
              </button>

              {/* Microsoft Button */}
              <button
                onClick={() => handleSignup('microsoft')}
                disabled={signingUp !== null}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 border border-white/10 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {signingUp === 'microsoft' ? (
                  <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 23 23" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0h11v11H0z" fill="#f25022" />
                    <path d="M12 0h11v11H12z" fill="#7fba00" />
                    <path d="M0 12h11v11H0z" fill="#00a4ef" />
                    <path d="M12 12h11v11H12z" fill="#ffb900" />
                  </svg>
                )}
                <span>Sign up with Microsoft</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
