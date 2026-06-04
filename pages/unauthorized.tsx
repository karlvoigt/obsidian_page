import React from 'react';
import { useAuth } from '../context/AuthContext';
import Head from 'next/head';
import Link from 'next/link';

export default function Unauthorized() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center px-4 py-12">
      <Head>
        <title>Unauthorized Access - Vault Notes</title>
      </Head>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl rounded-2xl p-8 md:p-10 text-center">
        <div className="mb-8">
          <div className="h-12 w-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m0-6h.01M5.938 18h12.124C19.602 18 20.5 16.924 20.5 15.6V8.4C20.5 7.076 19.602 6 18.062 6H5.938C4.398 6 3.5 7.076 3.5 8.4v7.2C3.5 16.924 4.398 18 5.938 18z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Access Forbidden</h2>
          <p className="mt-2 text-sm text-gray-300">
            Your account does not have the required permissions to view this resource.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/home" className="w-full flex items-center justify-center px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-blue-500/25">
            Return to Vault Notes
          </Link>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-5 py-3 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all duration-200 hover:-translate-y-0.5"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
