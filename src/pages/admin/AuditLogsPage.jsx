import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import * as XLSX from 'xlsx';

const AuditLogsPage = () => {
  const { currentUser, signatories, showToast } = useContext(AppContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearKey, setClearKey] = useState('');
  const [clearing, setClearing] = useState(false);

  const isAdmin = currentUser?.roleType !== 'Signatory' && currentUser?.roleType !== 'Student';

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (!isAdmin) {
      // Signatories filter by their own user_id (which logAction stores as user.id)
      query = query.eq('user_id', currentUser?.id || '');
    }
    const { data, error } = await query;
    if (!error && data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleClearLogs = async () => {
    const sig = signatories.find(s => s.id === currentUser?.id);
    if (!sig) return showToast('Could not verify your account.', 'error');
    if (clearKey.trim() !== (sig.secret_key || '').trim()) {
      return showToast('Incorrect secret key. Logs were NOT cleared.', 'error');
    }
    
    const rollback = [...logs];
    setLogs([]);
    setClearing(true);
    setShowClearModal(false);
    setClearKey('');

    const { error } = await supabase.from('audit_logs').delete().eq('user_id', currentUser?.id || '');
    setClearing(false);
    
    if (error) {
      setLogs(rollback);
      showToast('Failed to clear logs: ' + error.message, 'error');
    } else {
      showToast('Your audit logs have been cleared.');
    }
  };

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.details?.toLowerCase().includes(search.toLowerCase()) ||
    l.ip_address?.toLowerCase().includes(search.toLowerCase())
  );

  const actionColor = (action = '') => {
    if (action.toLowerCase().includes('added') || action.toLowerCase().includes('created')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (action.toLowerCase().includes('deleted') || action.toLowerCase().includes('removed') || action.toLowerCase().includes('revoked')) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    if (action.toLowerCase().includes('edited') || action.toLowerCase().includes('updated')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const exportToExcel = () => {
    try {
      const headerRow = [
        'Date & Time', 'User Name', 'Role', 'Action', 'Details', 'IP Address', 'Device', 'Browser', 'OS'
      ];

      const rows = filtered.map(log => [
        formatTime(log.created_at) || '—',
        log.user_name || '—',
        log.user_role || '—',
        log.action || '—',
        log.details || '—',
        log.ip_address || '—',
        log.device || '—',
        log.browser || '—',
        log.os || '—'
      ]);

      const worksheetData = [headerRow, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      const colWidths = [
        { wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
      
      const prefix = isAdmin ? "System" : (currentUser?.name || "User").replace(/[^a-z0-9]/gi, '_');
      const fileName = `${prefix}_AuditLogs_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showToast('Audit logs exported successfully!', 'success');
    } catch (err) {
      alert("EXCEL EXPORT ERROR:\n" + err.message + "\n\n" + err.stack);
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Audit Trail</h2>
          <p className="text-slate-500 dark:text-slate-400">{isAdmin ? 'Complete system activity log for all users' : 'Your personal activity history'}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text" placeholder="Search logs..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="p-2 px-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] text-sm"
          />
          <button onClick={exportToExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition text-sm flex items-center gap-2">
            📊 Export Excel
          </button>
          <button onClick={fetchLogs} className="bg-[#092B9C] text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-800 transition text-sm flex items-center gap-2">
            ↻ Refresh
          </button>
          {!isAdmin && (
            <button onClick={() => { setShowClearModal(true); setClearKey(''); }} className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-rose-700 transition text-sm flex items-center gap-2">
              🗑 Clear My Logs
            </button>
          )}
        </div>
      </div>

      {/* Secret Key Modal for Clear Logs */}
      {showClearModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }} className="flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">Confirm Log Clearance</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Enter your <strong>Secret Key</strong> to permanently delete all your audit logs. This cannot be undone.</p>
            <input
              type="password"
              placeholder="Your secret key..."
              value={clearKey}
              onChange={e => setClearKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleClearLogs()}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4 font-mono tracking-widest"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowClearModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleClearLogs} disabled={clearing || !clearKey.trim()} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition disabled:opacity-50">
                {clearing ? 'Clearing...' : 'Clear All Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Card><p className="text-center text-slate-500 py-12 animate-pulse">Loading audit logs...</p></Card>
      ) : filtered.length === 0 ? (
        <Card><p className="text-center text-slate-500 py-12 italic">No activity logs found yet. Actions you perform will appear here.</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => (
            <Card key={log.id} className="!p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Action badge */}
                  <span className={`shrink-0 text-xs font-black uppercase px-3 py-1.5 rounded-lg whitespace-nowrap ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{log.details || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      by <span className="font-bold text-slate-700 dark:text-slate-300">{log.user_name}</span>
                      {isAdmin && <span className="ml-1 text-slate-400">({log.user_role})</span>}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  <span title="IP Address">🌐 {log.ip_address || '—'}</span>
                  <span title="Device">💻 {log.device || '—'}</span>
                  <span title="Browser">🌏 {log.browser || '—'}</span>
                  <span title="OS">🖥 {log.os || '—'}</span>
                  <span className="text-slate-400">🕐 {formatTime(log.created_at)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};


// --- MAIN WRAPPER ---

export default AuditLogsPage;
