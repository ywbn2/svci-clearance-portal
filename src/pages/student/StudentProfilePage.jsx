import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { YEAR_DAYS, computeExpirationDate, getAccountStatus, getRemainingDays } from '../../utils/helpers';

const StudentProfilePage = () => {
  const { currentUser, setCurrentUser, students, departments, showToast } = useContext(AppContext);
  const student = students.find(s => s.id === currentUser?.id) || currentUser;

  // Find department by matching student's course
  const studentDept = departments.find(d => d.assignedCourses?.includes(student?.course));

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPwSection, setShowPwSection] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return showToast('Please fill all password fields.', 'error');
    if (pwForm.newPw !== pwForm.confirm) return showToast('New passwords do not match.', 'error');
    if (pwForm.newPw.length < 6) return showToast('Password must be at least 6 characters.', 'error');
    if (pwForm.current !== (student?.password || '')) return showToast('Current password is incorrect.', 'error');
    setChangingPw(true);
    const { error } = await supabase.from('students').update({ password: pwForm.newPw }).eq('id', student.id);
    setChangingPw(false);
    if (error) return showToast('Failed to update password: ' + error.message, 'error');
    setCurrentUser({ ...currentUser, password: pwForm.newPw });
    showToast('Password changed successfully!');
    setPwForm({ current: '', newPw: '', confirm: '' });
    setShowPwSection(false);
  };

  const createdDate = student?.signup_date ? new Date(student.signup_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const remainingDays = getRemainingDays(student?.expiration_date);
  const remText = remainingDays !== null ? `${remainingDays} days` : '—';
  const statusMatch = getAccountStatus(student);

  const fields = [
    { label: 'Full Name', value: student?.name || student?.firstname ? `${student.firstname} ${student.lastname}` : '—' },
    { label: 'Student ID', value: student?.id || '—' },
    { label: 'Course', value: student?.course || '—' },
    { label: 'Year Level', value: student?.yearLevel || '—' },
    { label: 'Department', value: studentDept?.name || 'Not assigned' },
    { label: 'Email', value: student?.email || '—' },
    { label: 'Date Created', value: createdDate },
    { label: 'Status', value: statusMatch },
    { label: 'Time Remaining', value: remText }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">My Profile</h2>
        <p className="text-slate-500 dark:text-slate-400">Your student credentials and account settings</p>
      </div>

      {/* Avatar + name card */}
      <Card>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#092B9C] flex items-center justify-center text-white text-2xl font-black shrink-0">
            {(student?.name || student?.firstname || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{student?.name || `${student?.firstname || ''} ${student?.lastname || ''}`}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{student?.id} &bull; {student?.course || 'No course assigned'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/70 dark:border-slate-700/50">
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{f.label}</p>
              {f.label === 'Status' ? (
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold leading-none mt-1 ${f.value === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : f.value === 'Expired' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                  {f.value}
                </span>
              ) : (
                <p className="font-bold text-slate-800 dark:text-white">{f.value}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <KeyIcon className="w-5 h-5 text-slate-500"/> Change Password
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Keep your account secure with a strong password</p>
          </div>
          <button onClick={() => setShowPwSection(v => !v)} className="px-4 py-2 bg-[#092B9C] text-white font-bold rounded-xl text-sm hover:bg-blue-800 transition">
            {showPwSection ? 'Cancel' : 'Change'}
          </button>
        </div>

        {showPwSection && (
          <div className="mt-6 space-y-3 animate-fade-in">
            <input type="password" placeholder="Current password" value={pwForm.current} onChange={e => setPwForm({...pwForm, current: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
            <input type="password" placeholder="New password (min 6 characters)" value={pwForm.newPw} onChange={e => setPwForm({...pwForm, newPw: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
            <input type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
            <button onClick={handleChangePassword} disabled={changingPw} className="w-full py-3 bg-[#092B9C] text-white font-bold rounded-xl hover:bg-blue-800 transition disabled:opacity-60">
              {changingPw ? 'Saving...' : 'Save New Password'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentProfilePage;
