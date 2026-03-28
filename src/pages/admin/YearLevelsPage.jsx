import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { supabase } from '../../supabaseClient';

const YearLevelsPage = () => {
  const { yearLevels, setYearLevels, showToast, showConfirm } = useContext(AppContext);
  const [newYear, setNewYear] = useState('');

  const handleAdd = async () => {
    if (!newYear.trim()) return;
    if (yearLevels.includes(newYear.trim())) return showToast('Year level already exists', 'error');
    const rollback = [...yearLevels];
    const updated = [...yearLevels, newYear.trim()];
    setYearLevels(updated);
    setNewYear('');
    const { error } = await supabase.from('app_settings').update({ year_levels: updated }).eq('id', 1);
    if (error) {
      setYearLevels(rollback); // correct rollback using saved copy
      showToast('Failed to save: ' + error.message, 'error');
    } else {
      showToast('Year level added successfully.');
    }
  };

  const handleDelete = async (yl) => {
    if (await showConfirm(`Delete "${yl}"? Students using this year level will keep their current assignment.`)) {
      const updated = yearLevels.filter(y => y !== yl);
      setYearLevels(updated);
      const { error } = await supabase.from('app_settings').update({ year_levels: updated }).eq('id', 1);
      if (error) {
        setYearLevels(yearLevels); // rollback
        showToast('Failed to delete: ' + error.message, 'error');
      } else {
        showToast('Year level deleted.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">Year Level Configuration</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage school year levels dynamically.</p>
      </div>

      <Card className="max-w-2xl">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input type="text" placeholder="e.g. 5th Year" value={newYear} onChange={e=>setNewYear(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
          <button onClick={handleAdd} className="bg-[#092B9C] hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold transition shadow-md whitespace-nowrap">Add Level</button>
        </div>

        <div className="space-y-3">
          {yearLevels.map((yl, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700/50 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition shadow-sm">
              <span className="font-bold text-lg text-slate-800 dark:text-gray-200"><CalendarIcon className="w-5 h-5 inline-block mr-3 text-slate-400" />{yl}</span>
              <button onClick={() => handleDelete(yl)} className="text-rose-500 hover:text-rose-700 font-bold hover:underline transition">Delete</button>
            </div>
          ))}
          {yearLevels.length === 0 && <p className="text-center text-slate-500 italic py-4">No year levels configured.</p>}
        </div>
      </Card>
    </div>
  );
};

export default YearLevelsPage;
