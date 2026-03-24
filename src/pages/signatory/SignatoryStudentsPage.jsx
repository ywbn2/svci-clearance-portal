import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import * as XLSX from 'xlsx';
import { Card } from '../../components/Navigation';
import { Modal, ModalPortal } from '../../components/Navigation';

const SignatoryStudentsPage = () => {
  const { students, setStudents, currentUser, signatories, showToast, showConfirm, logAction, courses, departments, yearLevels, signingEnabled, offices } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [activeStatusFilters, setActiveStatusFilters] = useState([]);
  const [activeCourseFilters, setActiveCourseFilters] = useState([]);
  const [activeYearFilters, setActiveYearFilters] = useState([]);
  const [activeDeptFilters, setActiveDeptFilters] = useState([]);

  const toggleFilter = (setFn, currentArr, val) => {
    if (currentArr.includes(val)) setFn(currentArr.filter(i => i !== val));
    else setFn([...currentArr, val]);
  };

  const isDeptSpecific = ['Dept. Dean', 'Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(currentUser?.role) || ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(currentUser?.office);
  const userDept = (currentUser?.dept_code || '').trim().toLowerCase();
  const visibleStudents = isDeptSpecific && currentUser?.dept_code 
    ? students.filter(s => (s.dept || '').trim().toLowerCase() === userDept) 
    : students;

  const filtered = visibleStudents.filter(s => {
    const clearanceStatus = s.office_clearances?.[currentUser?.office] || 'Pending';
    const matchSearch = (s.name?.toLowerCase() || '').includes(search.toLowerCase()) || (s.id?.toLowerCase() || '').includes(search.toLowerCase());
    const matchStatus = activeStatusFilters.length === 0 || activeStatusFilters.includes(clearanceStatus);
    const matchCourse = activeCourseFilters.length === 0 || activeCourseFilters.includes(s.course);
    const matchYear = activeYearFilters.length === 0 || activeYearFilters.includes(s.yearLevel);
    const matchDept = activeDeptFilters.length === 0 || activeDeptFilters.includes(s.dept);
    return matchSearch && matchStatus && matchCourse && matchYear && matchDept;
  });

  const toggleSelection = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(sid => sid !== id));
    } else {
      if (selectedStudents.length >= 20) {
        showToast("Maximum of 20 students can be selected for bulk actions.", "error");
        return;
      }
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filtered.length || selectedStudents.length === 20) {
      setSelectedStudents([]);
    } else {
      const remainingSlots = 20 - selectedStudents.length;
      const toAdd = filtered
        .filter(s => !selectedStudents.includes(s.id))
        .slice(0, remainingSlots)
        .map(s => s.id);
      setSelectedStudents([...selectedStudents, ...toAdd]);
    }
  };

  const exportToExcel = () => {
    try {
      const office = currentUser?.office || 'Unknown Office';
      const headerRow = [
        'ID', 'Full Name', 'Course', 'Department', 'Year Level', 'Account Status', `${office} Status`
      ];

      const rows = filtered.map(s => {
        const isSigned = s.office_clearances?.[office] === 'Cleared';
        return [
          s.id || '—',
          s.name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || '—',
          s.course || '—',
          s.dept || '—',
          s.yearLevel || '—',
          s.account_status || 'Active',
          isSigned ? 'Signed' : 'Unsigned'
        ];
      });

      const worksheetData = [headerRow, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      const colWidths = Array(headerRow.length).fill({ wch: 15 });
      colWidths[1] = { wch: 30 }; // wider name
      colWidths[6] = { wch: 25 }; // wider status
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clearance Masterlist");
      
      // Sanitizing office name for filename
      const safeOfficeName = (currentUser?.office || 'Signatory').replace(/[^a-z0-9]/gi, '_');
      const fileName = `${safeOfficeName}_Masterlist_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showToast('Excel exported successfully!', 'success');
      if (logAction) logAction(currentUser, 'Exported Excel', `Exported Signatory Masterlist as Excel with ${filtered.length} records`);
    } catch (err) {
      alert("EXCEL EXPORT ERROR:\n" + err.message + "\n\n" + err.stack);
      console.error(err);
    }
  };

  const handleBulkAction = async (actionType) => {
    // Secret key verification first
    const keyConfirmed = await requestSecretKey({ name: `${selectedStudents.length} selected student(s)`, office_clearances: {} });
    if (!keyConfirmed) return;

    const actionName = actionType === 'Cleared' ? 'approve' : 'remove approval for';
    if (await showConfirm(`Are you sure you want to ${actionName} clearance for ${selectedStudents.length} selected students at once?`)) {
      const office = currentUser?.office;
      const updates = selectedStudents.map(id => {
        const student = students.find(s => s.id === id);
        const newClearances = { ...(student?.office_clearances || {}), [office]: actionType };
        return supabase.from('students').update({ office_clearances: newClearances }).eq('id', id);
      });
      const results = await Promise.all(updates);
      const hasError = results.some(r => r.error);
      if (hasError) {
        showToast('Some updates failed. Please refresh and try again.', 'error');
      } else {
        setStudents(students.map(s => {
          if (!selectedStudents.includes(s.id)) return s;
          const newClearances = { ...(s.office_clearances || {}), [office]: actionType };
          return { ...s, office_clearances: newClearances };
        }));
        const studentNames = selectedStudents
          .map(id => students.find(s => s.id === id))
          .filter(Boolean)
          .map(s => `${s.name} (${s.id})`)
          .join(', ');
        showToast(`Successfully ${actionType === 'Cleared' ? 'approved' : 'revoked'} ${selectedStudents.length} students!`);
        const bulkActionLabel = actionType === 'Cleared' ? 'Bulk Approved Clearance' : 'Bulk Revoked Clearance';
        if (logAction) logAction(currentUser, bulkActionLabel, `Office: ${office} | ${selectedStudents.length} students: ${studentNames}`);
        setSelectedStudents([]);
      }
    }
  };

  const handleApproveAll = async () => {
    if (filtered.length === 0) return showToast('No students to approve.', 'error');
    const keyConfirmed = await requestSecretKey({ name: `all ${filtered.length} displayed student(s)`, office_clearances: {} });
    if (!keyConfirmed) return;
    if (!await showConfirm(`Approve clearance for ALL ${filtered.length} displayed students at ${currentUser?.office}? This cannot be undone easily.`)) return;

    const office = currentUser?.office;
    const toUpdate = filtered.filter(s => (s.office_clearances?.[office] || 'Pending') !== 'Cleared');
    if (toUpdate.length === 0) return showToast('All displayed students are already approved!', 'error');

    const updates = toUpdate.map(s => {
      const newClearances = { ...(s.office_clearances || {}), [office]: 'Cleared' };
      return supabase.from('students').update({ office_clearances: newClearances }).eq('id', s.id);
    });
    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);
    if (hasError) {
      showToast('Some updates failed. Please refresh and try again.', 'error');
    } else {
      const updatedIds = new Set(toUpdate.map(s => s.id));
      setStudents(students.map(s => {
        if (!updatedIds.has(s.id)) return s;
        return { ...s, office_clearances: { ...(s.office_clearances || {}), [office]: 'Cleared' } };
      }));
      showToast(`✅ Approved clearance for ${toUpdate.length} students!`);
      if (logAction) logAction(currentUser, 'Bulk Approved All', `Office: ${office} | Approved ${toUpdate.length} displayed students`);
    }
  };

  const handleRevokeAll = async () => {
    if (filtered.length === 0) return showToast('No students to revoke.', 'error');
    const keyConfirmed = await requestSecretKey({ name: `all ${filtered.length} displayed student(s)`, office_clearances: { [currentUser?.office]: 'Cleared' } });
    if (!keyConfirmed) return;
    if (!await showConfirm(`Remove clearance approval for ALL ${filtered.length} displayed students at ${currentUser?.office}? This is a major action.`, 'Confirm Revoke All', true)) return;

    const office = currentUser?.office;
    const toUpdate = filtered.filter(s => (s.office_clearances?.[office] || 'Pending') === 'Cleared');
    if (toUpdate.length === 0) return showToast('No approved students in the current view to revoke.', 'error');

    const updates = toUpdate.map(s => {
      const newClearances = { ...(s.office_clearances || {}), [office]: 'Pending' };
      return supabase.from('students').update({ office_clearances: newClearances }).eq('id', s.id);
    });
    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);
    if (hasError) {
      showToast('Some updates failed. Please refresh and try again.', 'error');
    } else {
      const updatedIds = new Set(toUpdate.map(s => s.id));
      setStudents(students.map(s => {
        if (!updatedIds.has(s.id)) return s;
        return { ...s, office_clearances: { ...(s.office_clearances || {}), [office]: 'Pending' } };
      }));
      showToast(`Revoked clearance for ${toUpdate.length} students.`, 'error');
      if (logAction) logAction(currentUser, 'Bulk Revoked All', `Office: ${office} | Revoked ${toUpdate.length} displayed students`);
    }
  };

  const [keyModalState, setKeyModalState] = useState(null); // { student, resolve }
  const [keyInput, setKeyInput] = useState('');

  const requestSecretKey = (student) => {
    return new Promise((resolve) => {
      setKeyInput('');
      setKeyModalState({ student, resolve });
    });
  };

  const handleKeySubmit = () => {
    const localModalState = keyModalState; // capture before clearing
    const sigRecord = signatories.find(s => s.id === currentUser?.id || s.email === currentUser?.email);
    const storedKey = (sigRecord?.secret_key || '').trim();
    if (!keyInput.trim() || keyInput.trim() !== storedKey) {
      showToast('❌ Incorrect secret key. Action blocked.', 'error');
      setKeyModalState(null);
      localModalState?.resolve(false);
      return;
    }
    setKeyModalState(null);
    localModalState?.resolve(true);
  };

  const toggleClearance = async (student) => {
    const confirmed = await requestSecretKey(student);
    if (!confirmed) return;
    const office = currentUser?.office;
    const currentOfficeClearance = student.office_clearances?.[office] || 'Pending';
    const newOfficeClearance = currentOfficeClearance === 'Pending' ? 'Cleared' : 'Pending';
    const newClearances = { ...(student.office_clearances || {}), [office]: newOfficeClearance };
    const { error } = await supabase.from('students').update({ office_clearances: newClearances }).eq('id', student.id);
    if (!error) {
      setStudents(students.map(s => s.id === student.id ? { ...s, office_clearances: newClearances } : s));
      showToast(`${student.name} — ${office}: ${newOfficeClearance}!`);
      const actionLabel = newOfficeClearance === 'Cleared' ? 'Approved Clearance' : 'Revoked Clearance';
      if (logAction) logAction(currentUser, actionLabel, `Student: ${student.name} (${student.id}) — Office: ${office} → ${newOfficeClearance}`);
    } else {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Clearance Requests</h2>
          <p className="text-slate-500 dark:text-slate-400">Approve or reject student obligations strictly for {currentUser?.office}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportToExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-md flex items-center gap-2 text-sm">
            📊 Export Excel
          </button>
          {signingEnabled && (
            <>
              <button onClick={handleApproveAll} className="bg-[#092B9C] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow-md flex items-center gap-2 text-sm">
                <CheckCircleIcon className="w-4 h-4" /> Approve All
              </button>
              <button onClick={handleRevokeAll} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-700 transition shadow-md flex items-center gap-2 text-sm">
                <XCircleIcon className="w-4 h-4" /> Revoke All
              </button>
            </>
          )}
        </div>
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
      <div className="flex flex-col gap-5">
        <input type="text" placeholder="Search records by Student ID or Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm w-full bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] shadow-sm transition" />
        
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border dark:border-slate-700/50 space-y-3 mb-4">
          <div className="flex flex-wrap gap-x-6 gap-y-3 items-start">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</span>
              <div className="flex gap-1.5">
                {['Pending', 'Cleared'].map(f => (
                  <button key={f} onClick={() => toggleFilter(setActiveStatusFilters, activeStatusFilters, f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wide transition-all border-2 ${activeStatusFilters.includes(f) ? (f === 'Cleared' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-600') : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Year Level</span>
              <div className="flex flex-wrap gap-1.5">
                {yearLevels.map(y => (
                  <button key={y} onClick={() => toggleFilter(setActiveYearFilters, activeYearFilters, y)}
                    className={`px-2.5 py-1 rounded-md text-xs font-black transition-all border-2 ${activeYearFilters.includes(y) ? 'bg-[#092B9C] text-white border-blue-800' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300'}`}>
                    {y}
                  </button>
                ))}
                {yearLevels.length === 0 && <span className="text-xs italic text-slate-400">None.</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Academic Course</span>
              <div className="grid grid-cols-3 gap-1">
                {(isDeptSpecific && currentUser?.dept_code 
                    ? courses.filter(c => departments.find(d => (d.code || '').trim().toLowerCase() === userDept)?.assignedCourses?.includes(c.code)) 
                    : courses).map(c => (
                  <button key={c.id} onClick={() => toggleFilter(setActiveCourseFilters, activeCourseFilters, c.code)}
                    className={`px-1.5 py-1 rounded-md text-[11px] font-black transition-all border-2 truncate ${activeCourseFilters.includes(c.code) ? 'bg-[#092B9C] text-white border-blue-800' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300'}`} title={c.name}>
                    {c.code}
                  </button>
                ))}
                {courses.length === 0 && <span className="text-xs italic text-slate-400 col-span-3">No courses registered.</span>}
              </div>
            </div>
            {!isDeptSpecific && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Department</span>
                <div className="grid grid-cols-3 gap-1">
                  {departments.map(d => (
                    <button key={d.id} onClick={() => toggleFilter(setActiveDeptFilters, activeDeptFilters, d.code)}
                      className={`px-1.5 py-1 rounded-md text-[11px] font-black transition-all border-2 truncate ${activeDeptFilters.includes(d.code) ? 'bg-violet-600 text-white border-violet-700' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300'}`} title={d.name}>
                      {d.code}
                    </button>
                  ))}
                  {departments.length === 0 && <span className="text-xs italic text-slate-400 col-span-3">No departments registered.</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

       {selectedStudents.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm animate-fade-in mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-[#092B9C]/10 text-[#092B9C] dark:bg-blue-900/30 dark:text-blue-400 px-5 py-2.5 rounded-full font-black text-sm items-center gap-3">
               <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#092B9C]/50 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#092B9C]"></span></span>
               {selectedStudents.length} / 20 SELECTED
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button onClick={() => setSelectedStudents([])} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition">Clear All</button>
              {signingEnabled ? (
                <>
                  <button onClick={() => handleBulkAction('Cleared')} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition flex items-center justify-center gap-2"><CheckCircleIcon className="w-5 h-5"/> Approve All Selected</button>
                  <button onClick={() => handleBulkAction('Pending')} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold bg-rose-500 text-white shadow-md hover:bg-rose-600 transition flex items-center justify-center gap-2"><XCircleIcon className="w-5 h-5"/> Remove All Approvals</button>
                </>
              ) : (
                <button disabled className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed flex items-center justify-center gap-2 shadow-inner"><XCircleIcon className="w-5 h-5"/> Multi-Action Disabled</button>
              )}
            </div>
          </div>
       )}

       <Card>
         <div className="overflow-x-auto border dark:border-slate-700 rounded-lg">
           <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-100 dark:bg-slate-900/80 border-b dark:border-slate-700">
                 <tr>
                   <th className="p-4 w-12">
                     <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#092B9C] focus:ring-[#092B9C] cursor-pointer" 
                       checked={selectedStudents.length > 0 && selectedStudents.length === Math.min(filtered.length, 20)} 
                       onChange={toggleSelectAll} 
                     />
                   </th>
                   <th className="p-4">ID</th><th className="p-4">Name</th><th className="p-4">Course</th><th className="p-4">Year Level</th><th className="p-4">Status</th><th className="p-4 text-center">Action</th>
                 </tr>
               </thead>
              <tbody className="text-slate-700 dark:text-slate-300">
                {filtered.map(s => (
                  <tr key={s.id} className={`border-b dark:border-slate-700 transition ${selectedStudents.includes(s.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    <td className="p-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#092B9C] focus:ring-[#092B9C] cursor-pointer" 
                        checked={selectedStudents.includes(s.id)} 
                        onChange={() => toggleSelection(s.id)} 
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{s.id}</td>
                    <td className="p-4 font-bold">{s.name}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-black">{s.course}</span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs font-bold">{s.yearLevel || 'N/A'}</td>
                    <td className="p-4">{(() => {
                      const officeStatus = s.office_clearances?.[currentUser?.office];
                      const isSigned = officeStatus === 'Cleared';
                      return <span className={`px-2 py-1 rounded text-xs font-black uppercase ${isSigned ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{isSigned ? '✓ Signed' : 'Not Signed'}</span>;
                    })()}</td>
                    <td className="p-4 text-center">{(() => {
                      const officeStatus = s.office_clearances?.[currentUser?.office];
                      const isSigned = officeStatus === 'Cleared';
                      if (!signingEnabled) {
                        return <button disabled className="bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-600 px-4 py-2 rounded-lg font-bold cursor-not-allowed shadow-inner transition whitespace-nowrap"><XCircleIcon className="w-4 h-4 inline-block mr-1 -mt-0.5" />Disabled By Admin</button>;
                      }
                      return isSigned
                        ? <button onClick={() => toggleClearance(s)} className="bg-rose-100 text-rose-800 px-3 py-2 rounded-lg font-bold hover:bg-rose-200 transition shadow-sm whitespace-nowrap">Remove Approval</button>
                        : <button onClick={() => toggleClearance(s)} className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-lg font-bold hover:bg-emerald-200 transition shadow-sm whitespace-nowrap">Approve Clearance</button>;
                    })()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan="7" className="p-4 text-center text-slate-500">No matching students found.</td></tr>}
              </tbody>
           </table>
         </div>
       </Card>

    {/* Secret Key Verification Modal */}
    {keyModalState && (
      <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} className="flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.20)] border border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <KeyIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Secret Key Required</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 ml-13">
              Enter your assigned secret key to {(keyModalState.student?.office_clearances?.[currentUser?.office] || 'Pending') === 'Pending' ? 'approve' : 'remove'} clearance for <span className="font-bold text-slate-700 dark:text-white">{keyModalState.student?.name}</span>.
            </p>
            <input
              type="password"
              placeholder="Enter your secret key..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleKeySubmit()}
              autoFocus
              className="w-full p-3 mb-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
            />
            <div className="flex gap-3">
              <button onClick={() => { const s = keyModalState; setKeyModalState(null); s?.resolve(false); }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleKeySubmit} className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-md">Confirm</button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

    </div>
  );
};

export default SignatoryStudentsPage;
