import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { getScopedOfficeName } from '../../utils/helpers';

const StudentDashboardPage = () => {
  const { currentUser, offices, officeCategories, requirements, students } = useContext(AppContext);
  const student = students.find(s => s.id === currentUser?.id) || currentUser;
  const clearances = student?.office_clearances || {};

  const signedCount = offices.filter(o => clearances[o] === 'Cleared').length;
  const allCleared = signedCount === offices.length && offices.length > 0;

  const schoolOffices = offices.filter(o => officeCategories[o] === 'School Clearance' || !officeCategories[o]).sort((a,b) => a.localeCompare(b));
  const ssgOffices = offices.filter(o => officeCategories[o] === 'SSG Clearance').sort((a,b) => a.localeCompare(b));

  const renderOfficeCard = (office) => {
    const cleared = clearances[office] === 'Cleared';
    const officeReqs = requirements.filter(r => 
      r.office === office && 
      (!r.dept_code || r.dept_code.trim().toLowerCase() === (student?.department || student?.dept || '').trim().toLowerCase())
    );
    const displayOffice = getScopedOfficeName(office, student?.dept);

    return (
      <div key={office} className={`rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-lg overflow-hidden ${cleared ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-700/60' : 'border-amber-200 bg-white dark:bg-slate-900 dark:border-slate-700 hover:border-amber-300'}`}>
        {/* Office header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${cleared ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-slate-800'}`}>
              {displayOffice.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight break-words">{displayOffice}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{officeReqs.length} requirement{officeReqs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 ml-2 ${cleared ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
            {cleared ? '✓ Signed' : 'Not Signed'}
          </span>
        </div>
        {/* Requirements list */}
        <div className="space-y-2">
          {officeReqs.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No requirements have been posted for this office.</p>
          ) : officeReqs.map(r => (
            <div key={r.id} className="flex items-start gap-2 text-sm min-w-0">
              <span className={`mt-0.5 shrink-0 ${r.mandatory ? 'text-rose-500' : 'text-slate-400'}`}>{r.mandatory ? '●' : '○'}</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold leading-snug break-words min-w-0 overflow-hidden" style={{wordBreak:'break-word', overflowWrap:'anywhere'}}>{r.title}{r.mandatory && <span className="ml-1 text-rose-500 font-black">*</span>}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">My Clearance Status</h2>
        <p className="text-slate-500 dark:text-slate-400">View your clearance status for each office below. Complete all requirements to receive full clearance.</p>
      </div>

      {/* Overall Banner */}
      <div className={`p-5 rounded-2xl flex items-center gap-4 border-2 ${allCleared ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700' : 'bg-amber-50 border-amber-300 dark:bg-amber-900/10 dark:border-amber-700'}`}>
        {allCleared ? <CheckCircleIcon className="w-10 h-10 text-emerald-500 shrink-0"/> : <AlertTriangleIcon className="w-10 h-10 text-amber-500 shrink-0"/>}
        <div>
          <p className={`font-black text-xl ${allCleared ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {allCleared
              ? '✅ Clearance Completed'
              : `Clearance Progress: ${offices.length > 0 ? Math.round((signedCount / offices.length) * 100) : 0}% Complete`
            }
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{allCleared ? 'All offices have approved your clearance — you are fully cleared!' : 'Some offices are still pending. Complete all requirements to proceed.'}</p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-10">
        {schoolOffices.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">School Clearance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {schoolOffices.map(renderOfficeCard)}
            </div>
          </div>
        )}

        {ssgOffices.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">SSG Clearance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {ssgOffices.map(renderOfficeCard)}
            </div>
          </div>
        )}
      </div>

      {offices.length === 0 && (
        <Card><p className="text-center text-slate-500 py-12 italic">No offices have been set up. Please contact the administrator.</p></Card>
      )}
      <p className="text-xs text-slate-400 text-center mt-4">● Mandatory &nbsp;|&nbsp; ○ Optional &nbsp;— Red asterisk (*) marks strictly required items</p>
    </div>
  );
};

export default StudentDashboardPage;
