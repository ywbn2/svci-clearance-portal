import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { getScopedOfficeName } from '../../utils/helpers';

const SignatoryDashboardPage = () => {
  const { currentUser, students, signingEnabled, departments } = useContext(AppContext);
  const isDeptSpecific = ['Dept. Dean', 'Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(currentUser?.role) || ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(currentUser?.office);
  const userDept = (currentUser?.dept_code || '').trim().toLowerCase();
  // Dual-match: include legacy students that store full dept name instead of code
  const userDeptName = (departments.find(d => (d.code || '').toLowerCase() === userDept)?.name || '').trim().toLowerCase();
  const visibleStudents = isDeptSpecific && currentUser?.dept_code 
    ? students.filter(s => {
        const sCode = (s.department || '').trim().toLowerCase();
        const sName = (s.dept || '').trim().toLowerCase();
        return sCode === userDept || (sName !== '' && sName === userDeptName);
      })
    : students;
  const pendingRequests = visibleStudents.filter(s => (s.office_clearances?.[currentUser?.office] || 'Pending') === 'Pending').length;
  const clearedRequests = visibleStudents.filter(s => s.office_clearances?.[currentUser?.office] === 'Cleared').length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">{getScopedOfficeName(currentUser?.office, currentUser?.dept_code)} Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400">Welcome back, {currentUser?.name || currentUser?.email || 'Signatory'}. Real-time clearance tasks for your office.</p>
      </div>
      
      {!signingEnabled && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500 text-amber-800 dark:text-amber-400 p-5 rounded-r-2xl shadow-sm text-sm font-bold flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-in my-6">
          <AlertTriangleIcon className="w-8 h-8 shrink-0 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-base uppercase tracking-widest font-black leading-none mb-1 text-amber-900 dark:text-amber-300">ATTENTION: Signing Restricted</span>
            <span className="opacity-90 font-medium">The Admin has temporarily deactivated clearance signing. You cannot approve or modify student records at this time.</span>
          </div>
        </div>
      )}

      {isDeptSpecific && currentUser?.dept_code && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-800 dark:text-blue-300 p-5 rounded-r-2xl shadow-sm text-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-in my-6 mb-8">
          <ShieldIcon className="w-8 h-8 shrink-0 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-base uppercase tracking-widest font-black leading-none mb-1 text-blue-900 dark:text-blue-300">Department Scope Active</span>
            <span className="opacity-90 font-medium">Your clearance queue is securely routed to the <strong>{currentUser.dept_code}</strong> department. You will only receive requests from students enrolled in this exact department.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-amber-500">
           <h3 className="font-bold text-lg text-slate-500">Pending Reviews</h3>
           <p className="text-4xl font-black mt-2 text-slate-800 dark:text-white">{pendingRequests}</p>
        </Card>
        <Card className="border-l-4 border-emerald-500">
           <h3 className="font-bold text-lg text-slate-500">Cleared Students</h3>
           <p className="text-4xl font-black mt-2 text-slate-800 dark:text-white">{clearedRequests}</p>
        </Card>
      </div>
    </div>
  );
};

export default SignatoryDashboardPage;
