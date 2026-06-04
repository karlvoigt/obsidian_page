import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Head from 'next/head';
import Link from 'next/link';

interface Invitation {
  token: string;
  used: boolean;
  createdAt: string;
  expiresAt: string;
  registeredUser: string | null;
}

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/admin/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      } else {
        setError('Failed to fetch invitation logs');
      }
    } catch (err) {
      setError('Network error loading invitations');
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      fetchInvitations();
    }
  }, [loading, user]);

  const handleGenerateInvite = async () => {
    setGenerating(true);
    setNewInviteLink(null);
    setCopied(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/generate-invite', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const origin = window.location.origin;
        setNewInviteLink(`${origin}/signup?token=${data.token}`);
        // Refresh the list
        await fetchInvitations();
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to generate invitation link');
      }
    } catch (err) {
      setError('Network error generating invite');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (newInviteLink) {
      navigator.clipboard.writeText(newInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (invite: Invitation) => {
    if (invite.used) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
          Used
        </span>
      );
    }
    const expired = new Date(invite.expiresAt) < new Date();
    if (expired) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950/40 text-rose-400 border border-rose-500/20">
          Expired
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-950/40 text-blue-400 border border-blue-500/20">
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Double check client-side role validation
  if (!user || user.role !== 'admin') {
    return null; // Next Middleware handles redirect, returning null protects view flash
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Head>
        <title>Admin Dashboard - Vault Notes</title>
      </Head>

      {/* Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="bg-indigo-600 px-3 py-1 rounded-md text-sm font-bold tracking-wider text-white">ADMIN</span>
            <h1 className="text-xl font-bold text-white tracking-tight">Vault Control</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/home" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
              View Notes
            </Link>
            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2">Invite Management</h2>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Create single-use signup invitation links. Anyone with these links can register to access the vault. Invitation tokens automatically expire after 7 days.
              </p>

              <button
                onClick={handleGenerateInvite}
                disabled={generating}
                className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
              >
                {generating ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Generating...
                  </>
                ) : (
                  'Generate Invitation Link'
                )}
              </button>

              {newInviteLink && (
                <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs text-indigo-400 font-bold tracking-wider uppercase">Invitation Link Generated</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newInviteLink}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 grow focus:outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600/25 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-semibold transition-all"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Column */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Generated Invitation History</h2>
                <span className="text-slate-400 text-xs font-mono">{invitations.length} invite(s) total</span>
              </div>

              {loadingInvites ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  Loading invitation logs...
                </div>
              ) : invitations.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No invitations have been generated yet. Use the control panel to create the first link.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 font-semibold border-b border-slate-800">
                        <th className="px-6 py-3 text-xs uppercase tracking-wider">Token / Invite Path</th>
                        <th className="px-6 py-3 text-xs uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-xs uppercase tracking-wider">Created At</th>
                        <th className="px-6 py-3 text-xs uppercase tracking-wider">Expires At</th>
                        <th className="px-6 py-3 text-xs uppercase tracking-wider">Registered User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {invitations.map((invite) => (
                        <tr key={invite.token} className="hover:bg-slate-800/10">
                          <td className="px-6 py-4 font-mono text-xs text-indigo-300 max-w-[200px] truncate" title={invite.token}>
                            {invite.token}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(invite)}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {new Date(invite.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs max-w-[120px] truncate" title={invite.registeredUser || ''}>
                            {invite.registeredUser ? (
                              <span className="text-emerald-400 font-mono">{invite.registeredUser}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
