import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { YEAR_DAYS, computeExpirationDate, getAccountStatus, getRemainingDays } from '../../utils/helpers';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { signingEnabled, setSigningEnabled, students, showToast, offices, signatories, showConfirm, logAction, eligibleStudents, currentUser } = useContext(AppContext);
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">System Overview</h2>
        <p className="text-slate-500 dark:text-slate-400">Clearance Management Analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        {[
          { title: "Registered Students", val: students.length, color: "border-blue-500 text-blue-600 dark:text-blue-400" },
          { title: "System Signatories", val: signatories.length, color: "border-purple-500 text-purple-600 dark:text-purple-400" },
          { title: "Active Accounts", val: students.filter(s => getAccountStatus(s) === 'Active').length, color: "border-emerald-500 text-emerald-600 dark:text-emerald-400" },
          { title: "Deactivated / Expired", val: students.filter(s => getAccountStatus(s) !== 'Active').length, color: "border-rose-500 text-rose-600 dark:text-rose-400" },
          { title: "100% Cleared", val: students.filter(s => offices.length > 0 && offices.filter(o => s.office_clearances?.[o] === 'Cleared').length === offices.length).length, color: "border-teal-500 text-teal-600 dark:text-teal-400" }
        ].map((s, i) => (
          <Card key={i} className={`border-l-4 ${s.color.split(' ')[0]}`}>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest leading-tight">{s.title}</p>
            <h2 className={`text-4xl font-black mt-2 ${s.color.split(' ').slice(1).join(' ')}`}>{s.val}</h2>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Quick Navigation</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button onClick={() => navigate('/students')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><StudentsIcon className="w-5 h-5 text-slate-500" /> Students</button>
            <button onClick={() => navigate('/signatories')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><PenIcon className="w-5 h-5 text-slate-500" /> Signatories</button>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><ShieldIcon className="w-5 h-5 text-slate-500" /> Admin Users</button>
            <button onClick={() => navigate('/courses')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><BookIcon className="w-5 h-5 text-slate-500" /> Courses</button>
            <button onClick={() => navigate('/departments')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><BuildingIcon className="w-5 h-5 text-slate-500" /> Departments</button>
            <button onClick={() => navigate('/year-levels')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><CalendarIcon className="w-5 h-5 text-slate-500" /> Year Levels</button>
            <button onClick={() => navigate('/requirements')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><FileCheckIcon className="w-5 h-5 text-slate-500" /> Requirements</button>
            <button onClick={() => navigate('/logs')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs"><FileTextIcon className="w-5 h-5 text-slate-500" /> Audit Logs</button>
            <button onClick={() => navigate('/eligible-students')} className="flex items-center gap-2 p-3 text-left border dark:border-slate-600 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white transition text-xs col-span-2 lg:col-span-1"><ShieldIcon className="w-5 h-5 text-indigo-500" /> Student Registry</button>
          </div>
        </Card>

        <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
          <h3 className="font-bold text-lg text-rose-700 dark:text-rose-400 mb-4 border-b border-rose-200 dark:border-rose-900/50 pb-2">System Controls</h3>
          <div className="space-y-3">
            <button 
              disabled={!isSuperAdmin}
              onClick={async () => {
                if (await showConfirm(`Are you sure you want to ${signingEnabled ? 'DISABLE' : 'ENABLE'} system-wide manual clearance signing?`)) {
                  const newVal = !signingEnabled;
                  await supabase.from('app_settings').update({ signing_enabled: newVal }).eq('id', 1);
                  setSigningEnabled(newVal);
                  showToast(`Clearance Signing has been ${newVal ? 'ENABLED' : 'DISABLED'}.`);
                  if (logAction) logAction({ name: currentUser?.name || 'Admin', roleType: 'Admin' }, `System Settings`, `Global Clearance Signing ${newVal ? 'Enabled' : 'Disabled'}`);
                }
              }} 
              className={`flex justify-center items-center gap-2 w-full py-3 rounded-xl font-bold shadow-sm transition-all ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : (signingEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200')}`}
              title={!isSuperAdmin ? "Only Super Admin can change global signing settings" : ""}
            >
              {signingEnabled ? <><CheckCircleIcon className="w-5 h-5" /> Clearance Signing is ACTIVE</> : <><XCircleIcon className="w-5 h-5" /> Clearance Signing is DISABLED</>}
            </button>
            <button 
              disabled={!isSuperAdmin}
              onClick={async () => {
                if (await showConfirm("Are you sure you want to clear ALL audit logs? This cannot be undone.", "Clear All Logs", true)) {
                  const { data: logIds } = await supabase.from('audit_logs').select('id');
                  if (!logIds || logIds.length === 0) return showToast("No logs to clear.", "error");
                  const ids = logIds.map(l => l.id);
                  for (let i = 0; i < ids.length; i += 100) {
                    await supabase.from('audit_logs').delete().in('id', ids.slice(i, i + 100));
                  }
                  showToast(`${ids.length} audit log(s) cleared successfully.`);
                  if (logAction) logAction(currentUser, `Log Clearance`, `Cleared all ${ids.length} audit logs.`);
                }
              }} 
              className={`w-full py-2 font-bold rounded-xl transition ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold rounded-xl hover:bg-slate-100'}`}
              title={!isSuperAdmin ? "Only Super Admin can clear audit logs" : ""}
            >Clear All Logs</button>
            <button 
              disabled={!isSuperAdmin}
              onClick={async () => {
                if (await showConfirm("WARNING: This will reset ALL students' clearances to PENDING and permanently delete ALL posted requirements for a new semester. Student accounts will NOT be deleted. Are you sure you want to start a new clearance period?", "Reset Semester", true)) {
                  let hasStudentError = false;
                  const allIds = students.map(s => s.id);
                  if (allIds.length > 0) {
                    for (let i = 0; i < allIds.length; i += 100) {
                      const { error } = await supabase.from('students')
                        .update({ office_clearances: {}, status: 'PENDING' })
                        .in('id', allIds.slice(i, i + 100));
                      if (error) hasStudentError = true;
                    }
                  }
                  let hasReqError = false;
                  const { data: reqIds } = await supabase.from('requirements').select('id');
                  if (reqIds && reqIds.length > 0) {
                    const rIds = reqIds.map(r => r.id);
                    for (let i = 0; i < rIds.length; i += 100) {
                      const { error } = await supabase.from('requirements').delete().in('id', rIds.slice(i, i + 100));
                      if (error) hasReqError = true;
                    }
                  }

                  if (hasStudentError || hasReqError) {
                    showToast("Semester reset completed with some errors.", "error");
                  } else {
                    if (logAction) logAction(currentUser, `System Reset`, `Reset all student clearances and deleted all requirements for a new semester.`);
                    showToast("Semester reset successfully. All clearances are now PENDING.");
                  }
                }
              }} 
              className={`w-full py-2 font-bold rounded-xl transition flex items-center justify-center gap-2 ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-2 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
              title={!isSuperAdmin ? "Only Super Admin can reset the semester" : ""}
            ><CalendarIcon className="w-4 h-4" /> Reset Semester Clearances</button>
            
            <button 
              disabled={!isSuperAdmin}
              onClick={async () => {
                const idsToPurge = students.filter(s => {
                  const acct = getAccountStatus(s);
                  return acct === 'Deactivated' || acct === 'Expired';
                }).map(s => s.id);
                if (idsToPurge.length === 0) return showToast("No deactivated or expired accounts found to purge.", "error");
                if (await showConfirm(`Are you sure you want to permanently DELETE ${idsToPurge.length} inactive account(s)? This cannot be undone.`)) {
                  let hasError = false;
                  for (let i = 0; i < idsToPurge.length; i += 100) {
                    const { error } = await supabase.from('students').delete().in('id', idsToPurge.slice(i, i + 100));
                    if (error) hasError = true;
                  }
                  if (!hasError) {
                    showToast(`Successfully purged ${idsToPurge.length} inactive student accounts.`);
                    if (logAction) logAction(currentUser, `Account Purge`, `Deleted ${idsToPurge.length} inactive student accounts.`);
                  } else {
                    showToast("Partial failure purging accounts.", "error");
                  }
                }
              }} 
              className={`w-full py-2 font-bold rounded-xl transition ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-2 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-900/50 text-amber-700 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
              title={!isSuperAdmin ? "Only Super Admin can purge inactive accounts" : ""}
            >Purge Inactive Accounts</button>

            <button 
              disabled={!isSuperAdmin}
              onClick={async () => {
                if (students.length === 0) return showToast("No students to wipe.", "error");
                if (await showConfirm("DANGER: Are you sure you want to permanently wipe ALL student records from the database? This affects all clearances, but keeps your offices and settings intact. This is irreversible!")) {
                  const allIds = students.map(s => s.id);
                  for (let i = 0; i < allIds.length; i += 100) {
                    await supabase.from('students').delete().in('id', allIds.slice(i, i + 100));
                  }
                  showToast("All student data wiped successfully.");
                  if (logAction) logAction(currentUser, `System Wipe`, `Permanently deleted all student accounts.`);
                }
              }} 
              className={`flex justify-center items-center gap-2 w-full py-2 font-bold rounded-xl shadow-md transition ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : 'bg-rose-600/90 text-white hover:bg-rose-700'}`}
              title={!isSuperAdmin ? "Only Super Admin can wipe student data" : ""}
            ><AlertTriangleIcon className="w-4 h-4" /> Wipe All Student Data</button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Registered Students</h3>
          <button onClick={() => navigate('/students')} className="text-sm font-bold text-[#092B9C] dark:text-blue-400 hover:underline">View All &rarr;</button>
        </div>
        <div className="overflow-x-auto border dark:border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-900/80 border-b dark:border-slate-700 text-slate-800 dark:text-slate-200">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Course</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {students.slice(0, 5).map((student, idx) => (
                <tr key={idx} className="border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-4">{student.id}</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{student.name}</td>
                  <td className="p-4">{student.course}</td>
                  <td className="p-4">
                   {(() => {
                     const signedCount = offices.filter(o => student.office_clearances?.[o] === 'Cleared').length;
                     const total = offices.length;
                     const percentage = total === 0 ? 0 : Math.round((signedCount / total) * 100);
                     const colorClass = percentage === 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : percentage >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400';
                     const barColor = percentage === 100 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                     return (
                       <div className="flex items-center gap-3 w-32">
                         <span className={`px-2 py-1 rounded-md text-[10px] font-black w-14 text-center shrink-0 ${colorClass}`}>
                           {percentage}%
                         </span>
                         <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
                         </div>
                       </div>
                     );
                   })()}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-slate-500">No students registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};

export default DashboardPage;
