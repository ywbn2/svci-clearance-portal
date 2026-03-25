import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AppContext } from '../../context/AppContext';
import * as XLSX from 'xlsx';
import { Card } from '../../components/Navigation';
import { Modal, ModalPortal } from '../../components/Navigation';
import { YEAR_DAYS, computeExpirationDate, getAccountStatus, getRemainingDays } from '../../utils/helpers';

const EditDaysModal = ({ student, onClose, onConfirm }) => {
  const [days, setDays] = useState(0);
  const base = student.expiration_date || new Date().toISOString().split('T')[0];
  
  let newExp = "Invalid Date";
  let isValid = false;
  
  try {
    const parsedDays = parseInt(days);
    if (!isNaN(parsedDays)) {
      if (parsedDays >= -36500 && parsedDays <= 36500) {
        const d = new Date(base);
        d.setDate(d.getDate() + parsedDays);
        if (!isNaN(d.getTime())) {
          newExp = d.toISOString().split('T')[0];
          isValid = true;
        }
      } else {
        newExp = "Limit Exceeded (Max ±36,500)";
      }
    } else if (days === '' || days === '-') {
      newExp = base; 
    }
  } catch (e) {
    newExp = "Calculation Error";
  }

  return (
    <ModalPortal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} className="flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.18)] border border-slate-200/50 dark:border-slate-800/50">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Edit Remaining Days</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Adjust <span className="font-bold text-slate-700 dark:text-white">{student.name}</span>'s remaining days.
          </p>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Adjust Days</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  value={days} 
                  onChange={e => setDays(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 dark:border-slate-800 focus:border-[#092B9C] rounded-2xl bg-white dark:bg-slate-800 dark:text-white font-bold text-xl outline-none transition"
                  placeholder="e.g. 30 or -10"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">Use positive numbers to add days, negative to subtract (Max ±36,500).</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700/50">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-500">Current Expiration:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{base}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-2 border-t dark:border-slate-700">
                <span className={`transition-colors ${isValid ? 'text-[#092B9C] dark:text-blue-400' : 'text-rose-600'}`}>New Expiration:</span>
                <span className={`font-mono transition-colors ${isValid ? 'text-[#092B9C] dark:text-blue-400' : 'text-rose-600'}`}>{newExp}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-200 transition">Cancel</button>
            <button 
              disabled={!isValid}
              onClick={() => onConfirm(student, parseInt(days || 0))} 
              className={`flex-1 py-4 text-white font-bold rounded-2xl shadow-xl transition ${isValid ? 'bg-[#092B9C] hover:bg-blue-800' : 'bg-slate-300 dark:bg-slate-700 opacity-50 cursor-not-allowed'}`}
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const EditClearanceModal = ({ student, offices, onClose, onConfirm }) => {
  const [clearances, setClearances] = useState(() => {
    const init = {};
    const existing = student.office_clearances || {};
    offices.forEach(o => { init[o] = existing[o] === 'Cleared'; });
    return init;
  });
  
  const [selectedOffices, setSelectedOffices] = useState([]);

  const toggleSelectOffice = (office) => {
    if (selectedOffices.includes(office)) setSelectedOffices(selectedOffices.filter(o => o !== office));
    else setSelectedOffices([...selectedOffices, office]);
  };

  const handleSignSelected = () => {
    const next = { ...clearances };
    selectedOffices.forEach(o => next[o] = true);
    setClearances(next);
    setSelectedOffices([]);
  };

  const handleRevokeSelected = () => {
    const next = { ...clearances };
    selectedOffices.forEach(o => next[o] = false);
    setClearances(next);
    setSelectedOffices([]);
  };

  const handleSignAll = () => {
    const next = {};
    offices.forEach(o => next[o] = true);
    setClearances(next);
  };

  const handleRevokeAll = () => {
    const next = {};
    offices.forEach(o => next[o] = false);
    setClearances(next);
  };

  const handleApply = () => {
    const result = {};
    offices.forEach(o => { result[o] = clearances[o] ? 'Cleared' : 'Pending'; });
    onConfirm(student, result);
  };

  return (
    <ModalPortal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', transition: 'opacity 0.2s ease' }} className="flex items-start justify-center p-4 py-8 overflow-y-auto animate-fade-in">
        <div className="w-full max-w-4xl bg-slate-50 dark:bg-[#0a0f1c] p-6 sm:p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-slate-800/50 my-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-1 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center border border-purple-200 dark:border-purple-800">❖</span>
                Clearance Editor
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Manage signature cards for <span className="font-bold text-slate-700 dark:text-gray-200">{student.name}</span> ({student.id})
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleSignAll} className="flex-1 md:flex-none px-4 py-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 font-bold rounded-xl hover:bg-emerald-200 transition text-sm flex items-center justify-center gap-2">✓ Sign All</button>
              <button onClick={handleRevokeAll} className="flex-1 md:flex-none px-4 py-2 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 font-bold rounded-xl hover:bg-rose-200 transition text-sm flex items-center justify-center gap-2">✕ Revoke All</button>
            </div>
          </div>

          {selectedOffices.length > 0 && (
             <div className="bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-900/60 p-4 rounded-2xl shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in scale-100 origin-top">
               <span className="font-black text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 rounded-xl text-sm border border-purple-100 dark:border-purple-800/50 block w-full text-center sm:w-auto sm:text-left shadow-sm">{selectedOffices.length} Offices Selected</span>
               <div className="flex gap-2 w-full sm:w-auto">
                 <button onClick={handleSignSelected} className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 hover:-translate-y-0.5 transition text-sm flex items-center justify-center">Approve Selected</button>
                 <button onClick={handleRevokeSelected} className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-500 text-white font-bold rounded-xl shadow-md hover:bg-rose-600 hover:-translate-y-0.5 transition text-sm flex items-center justify-center">Revoke Selected</button>
               </div>
             </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8 max-h-[55vh] overflow-y-auto p-1 custom-scrollbar">
            {offices.map(o => (
              <div key={o} onClick={() => toggleSelectOffice(o)} className={`relative flex flex-col justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${selectedOffices.includes(o) ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-purple-50/40 dark:bg-purple-900/20' : clearances[o] ? 'border-emerald-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'}`}>
                 <div className="absolute top-4 right-4">
                    <input type="checkbox" checked={selectedOffices.includes(o)} readOnly className="w-5 h-5 rounded-lg border-slate-300 text-purple-600 focus:ring-purple-500 bg-slate-50 dark:bg-slate-700 cursor-pointer pointer-events-none transition-colors" />
                 </div>
                 
                 <div className="mt-2 mb-6 pr-8">
                   <h3 className="font-black text-lg text-slate-800 dark:text-white leading-tight">{o}</h3>
                 </div>
                 
                 <div className="mt-auto">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setClearances(prev => ({...prev, [o]: !prev[o]})) }} 
                     className={`w-full py-3 rounded-xl text-sm font-black transition-all border-b-4 ${clearances[o] ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-400 hover:bg-emerald-200 hover:-translate-y-0.5' : 'bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:-translate-y-0.5'}`}
                   >
                     {clearances[o] ? '✓ Cleared' : 'Pending'}
                   </button>
                 </div>
              </div>
            ))}
            {offices.length === 0 && <div className="col-span-full p-12 text-center italic text-slate-400 font-bold border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">No clearance offices configured in the system.</div>}
          </div>

          <div className="flex gap-4 pt-6 mt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition">Cancel Setup</button>
            <button onClick={handleApply} className="flex-[2] py-4 bg-[#092B9C] text-white font-black text-lg rounded-2xl shadow-xl hover:bg-blue-800 hover:-translate-y-1 transition-all">Save Clearance Changes</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const StudentsPage = () => {
  const { students, setStudents, courses, departments, yearLevels, offices, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);
  const [search, setSearch] = useState('');
  const [activeStatusFilters, setActiveStatusFilters] = useState([]);
  const [activeCourseFilters, setActiveCourseFilters] = useState([]);
  const [activeYearFilters, setActiveYearFilters] = useState([]);
  const [activeDeptFilters, setActiveDeptFilters] = useState([]);

  const exportToExcel = () => {
    try {
      const headerRow = [
        'ID', 'Full Name', 'Course', 'Department', 'Year Level', 'Account Status', 'Expiration Date', ...offices
      ];

      const rows = filteredStudents.map(s => {
        const row = [
          s.id || '—',
          s.name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || '—',
          s.course || '—',
          s.department || '—',
          s.yearLevel || '—',
          s.account_status || 'Active',
          s.expiration_date || '—'
        ];
        offices.forEach(o => { 
          row.push((s.office_clearances?.[o] === 'Cleared') ? 'Signed' : 'Unsigned'); 
        });
        return row;
      });

      const worksheetData = [headerRow, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      const colWidths = Array(headerRow.length).fill({ wch: 15 });
      colWidths[1] = { wch: 30 }; // Name column wider
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Student Masterlist");
      
      const fileName = `StudentMasterlist_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showToast('Excel exported successfully!', 'success');
      if (logAction) logAction(currentUser, 'Exported Excel', `Exported Student Masterlist as Excel with ${filteredStudents.length} records`);
    } catch (err) {
      alert("EXCEL EXPORT ERROR:\n" + err.message + "\n\n" + err.stack);
      console.error(err);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [clearanceModal, setClearanceModal] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-btn') && !e.target.closest('.dropdown-menu-content')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleFilter = (setFn, currentArr, val) => {
    if (currentArr.includes(val)) setFn(currentArr.filter(i => i !== val));
    else setFn([...currentArr, val]);
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = (s.name?.toLowerCase() || '').includes(search.toLowerCase()) || (s.id?.toLowerCase() || '').includes(search.toLowerCase());
    const matchStatus = activeStatusFilters.length === 0 || activeStatusFilters.includes(s.status);
    const matchCourse = activeCourseFilters.length === 0 || activeCourseFilters.includes(s.course);
    const matchYear = activeYearFilters.length === 0 || activeYearFilters.includes(s.yearLevel);
    const matchDept = activeDeptFilters.length === 0 || activeDeptFilters.includes(s.department);
    return matchSearch && matchStatus && matchCourse && matchYear && matchDept;
  }).sort((a, b) => (a.lastname || '').localeCompare(b.lastname || ''));
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    id: '', firstname: '', middlename: '', lastname: '', dob: '', gender: '', yearLevel: '', course: '', email: '', password: ''
  });

  const getDepartmentForCourse = (selectedCourse) => {
    const dept = departments.find(d => d.assignedCourses && d.assignedCourses.includes(selectedCourse));
    return dept ? dept.code : 'Unassigned';
  };

  const handleOpenModal = (student = null) => {
    if (student) {
      setEditingId(student.id);
      setFormData({
        id: student.id,
        firstname: student.firstname || '',
        middlename: student.middlename || '',
        lastname: student.lastname || '',
        dob: student.dob || '',
        gender: student.gender || '',
        yearLevel: student.yearLevel || '',
        course: student.course || '',
        email: student.email || '',
        password: student.password || ''
      });
    } else {
      setEditingId(null);
      setFormData({ id: '', firstname: '', middlename: '', lastname: '', dob: '', gender: '', yearLevel: '', course: '', email: '', password: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingId && !formData.id) return showToast("Student ID is required!", "error");
    
    const assignedDept = getDepartmentForCourse(formData.course);
    const fullName = `${formData.firstname} ${formData.middlename || ''} ${formData.lastname}`.replace(/\s+/g, ' ').trim();
    
    const saveData = {
      name: fullName,
      firstname: formData.firstname.trim(),
      middlename: formData.middlename.trim() || null,
      lastname: formData.lastname.trim(),
      dob: formData.dob || null,
      gender: formData.gender || null,
      yearLevel: formData.yearLevel || null,
      course: formData.course,
      department: assignedDept,
      email: formData.email,
      password: formData.password
    };

    setShowModal(false); // UI instantly closes

    if (editingId) {
      const rollback = [...students];
      setStudents(students.map(s => s.id === editingId ? { ...s, ...saveData } : s));
      supabase.from('students').update(saveData).eq('id', editingId).then(({error}) => {
        if (!error) {
          showToast("Student account updated successfully!", "success");
        } else {
          setStudents(rollback);
          showToast('Update failed: ' + (error.message || JSON.stringify(error)), 'error');
        }
      });
    } else {
      const insertData = { id: formData.id, ...saveData };
      const rollback = [...students];
      setStudents([...students, insertData]);
      supabase.from('students').insert([insertData]).then(({error}) => {
        if (!error) {
          showToast("New student registered successfully!", "success");
        } else {
          setStudents(rollback);
          showToast('Insert failed: ' + (error.message || JSON.stringify(error)), 'error');
        }
      });
    }
  };

  const handleDelete = async (id) => {
    if (await showConfirm("Are you sure you want to completely delete this student account?")) {
      const rollback = [...students];
      setStudents(students.filter(s => s.id !== id));
      
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (!error) {
        showToast("Student account deleted permanently.", "error");
      } else {
        setStudents(rollback);
        showToast(error.message, "error");
      }
    }
  };

  const handleSetAccountStatus = async (student, newStatus) => {
    const label = newStatus === 'Active' ? 'activate' : 'deactivate';
    if (!await showConfirm(`Are you sure you want to ${label} ${student.name}'s account?`, 'Change Account Status', newStatus !== 'Active')) return;
    const updatePayload = { account_status: newStatus };
    if (newStatus === 'Active' && getAccountStatus(student) === 'Expired') {
      const today = new Date().toISOString().split('T')[0];
      updatePayload.expiration_date = computeExpirationDate(today, student.yearLevel);
      updatePayload.signup_date = today;
    }
    
    const rollback = [...students];
    setStudents(students.map(s => s.id === student.id ? { ...s, ...updatePayload } : s));
    
    const { error } = await supabase.from('students').update(updatePayload).eq('id', student.id);
    if (error) {
      setStudents(rollback);
      return showToast('Failed: ' + error.message, 'error');
    }
    
    showToast(`Account ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully!`);
    logAction(currentUser, `Account ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`, `Set ${student.name} account to ${newStatus}`);
  };

  const [extendModal, setExtendModal] = useState(null); // student object

  const handleExtendExpiration = (student) => {
    setExtendModal(student);
  };

  const handleConfirmExtend = async (student, days) => {
    const base = student.expiration_date || new Date().toISOString().split('T')[0];
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    const newExp = d.toISOString().split('T')[0];
    const updatePayload = { expiration_date: newExp, account_status: 'Active' };
    
    const rollback = [...students];
    setStudents(students.map(s => s.id === student.id ? { ...s, ...updatePayload } : s));
    setExtendModal(null);
    
    const { error } = await supabase.from('students').update(updatePayload).eq('id', student.id);
    if (error) {
      setStudents(rollback);
      return showToast('Failed: ' + error.message, 'error');
    }
    
    showToast(`Expiration extended to ${newExp}!`);
    logAction(currentUser, 'Extended Expiration', `Extended ${student.name}'s account to ${newExp}`);
  };

  const handleConfirmClearance = async (student, newClearances) => {
    const updatePayload = { office_clearances: newClearances };
    
    const rollback = [...students];
    setStudents(students.map(s => s.id === student.id ? { ...s, ...updatePayload } : s));
    setClearanceModal(null);
    
    const { error } = await supabase.from('students').update(updatePayload).eq('id', student.id);
    if (error) {
      setStudents(rollback);
      return showToast('Failed: ' + error.message, 'error');
    }
    
    showToast(`Clearance updated for ${student.name}!`);
    logAction(currentUser, 'Edited Clearance', `Superadmin manually updated clearance map for ${student.name}`);
  };

  return (
    <Card className="h-full relative">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Student Masterlist</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportToExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-md flex items-center gap-2 text-sm">
            📊 Export Excel
          </button>
          <button onClick={() => handleOpenModal()} className="bg-[#092B9C] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow-md">+ Add Student</button>
        </div>
      </div>

      <div className="flex flex-col gap-5 mb-6">
        <input type="text" placeholder="Search records by Student ID or Name..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm w-full bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] shadow-sm transition" />
        
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border dark:border-slate-700/50 space-y-3">
          {/* Row 1: Status + Year Level */}
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

          {/* Row 2: Course + Department side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Academic Course</span>
              <div className="grid grid-cols-3 gap-1">
                {courses.map(c => (
                  <button key={c.id} onClick={() => toggleFilter(setActiveCourseFilters, activeCourseFilters, c.code)}
                    className={`px-1.5 py-1 rounded-md text-[11px] font-black transition-all border-2 truncate ${activeCourseFilters.includes(c.code) ? 'bg-[#092B9C] text-white border-blue-800' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300'}`} title={c.name}>
                    {c.code}
                  </button>
                ))}
                {courses.length === 0 && <span className="text-xs italic text-slate-400 col-span-3">No courses registered.</span>}
              </div>
            </div>
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
          </div>
        </div>
      </div>

      <div className="w-full border dark:border-slate-700 rounded-lg shadow-sm overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-base min-w-[1200px]">
          <thead className="bg-slate-100 dark:bg-slate-900/80 border-b dark:border-slate-700 text-slate-800 dark:text-slate-200">
            <tr><th className="p-4">ID</th><th className="p-4 " style={{ minWidth: '200px' }}>Name</th><th className="p-4">Course</th><th className="p-4">Year Level</th><th className="p-4">Department</th><th className="p-4">Clearance</th><th className="p-4">Account</th><th className="p-4">Expiration</th><th className="p-4">Remaining</th><th className="p-4 text-center">Actions</th></tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-300">
            {filteredStudents.map((student, idx) => (
              <tr key={idx} className="border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                 <td className="p-4">{student.id}</td>
                 <td className="p-4 font-bold text-slate-900 dark:text-white">{student.name}</td>
                 <td className="p-4">
                   <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-sm font-black">{student.course}</span>
                 </td>
                 <td className="p-4 text-slate-500 font-bold text-sm">{student.yearLevel || 'N/A'}</td>
                 <td className="p-4">
                   <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 px-2 py-1 rounded text-sm font-black" title={(() => {
                     const fdept = departments.find(d => d.code === student.department);
                     return fdept ? fdept.name : student.department;
                   })()}>{student.department}</span>
                 </td>
                 <td className="p-4">
                   {(() => {
                     const signedCount = offices.filter(o => student.office_clearances?.[o] === 'Cleared').length;
                     const total = offices.length;
                     const percentage = total === 0 ? 0 : Math.round((signedCount / total) * 100);
                     const colorClass = percentage === 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : percentage >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400';
                     const barColor = percentage === 100 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                     return (
                       <div className="flex items-center gap-3 w-32">
                         <span className={`px-2 py-1 rounded-md text-xs font-black w-14 text-center shrink-0 ${colorClass}`}>
                           {percentage}%
                         </span>
                         <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }}></div>
                         </div>
                       </div>
                     );
                   })()}
                 </td>
                 <td className="p-4">{(() => {
                   const acct = getAccountStatus(student);
                   const colors = { Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', Expired: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', Deactivated: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' };
                   return <span className={`px-2 py-1 rounded text-sm font-black uppercase ${colors[acct]}`}>{acct}</span>;
                 })()}</td>
                 <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{student.expiration_date || '—'}</td>
                 <td className="p-4">{(() => {
                   const rem = getRemainingDays(student.expiration_date);
                   if (rem === null) return <span className="text-slate-400 text-sm">—</span>;
                   if (rem <= 0) return <span className="text-sm font-black text-rose-600">Expired</span>;
                   if (rem <= 7) return <span className="text-sm font-black text-amber-600 animate-pulse">⚠ {rem}d left</span>;
                   return <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{rem} days</span>;
                 })()}</td>
                 <td className="p-4">
                   <div className="relative flex justify-center">
                     <button 
                       className="action-menu-btn text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                       onClick={(e) => {
                         e.stopPropagation();
                         setActiveDropdown(activeDropdown === student.id ? null : student.id);
                       }}
                       title="Actions"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                       </svg>
                     </button>
                     
                     {activeDropdown === student.id && (
                       <div className="dropdown-menu-content absolute right-8 top-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[100] flex flex-col p-1 animate-fade-in font-medium">
                         <button onClick={() => { setActiveDropdown(null); handleOpenModal(student); }} className="text-left w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">Edit Info</button>
                         <button onClick={() => { setActiveDropdown(null); handleExtendExpiration(student); }} className="text-left w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition">Edit Days Active</button>
                         <button onClick={() => { setActiveDropdown(null); setClearanceModal(student); }} className="text-left w-full px-4 py-2.5 text-sm font-bold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition">Edit Clearance Status</button>
                         <button onClick={() => { setActiveDropdown(null); handleSetAccountStatus(student, getAccountStatus(student) !== 'Active' ? 'Active' : 'Deactivated'); }} className={`text-left w-full px-4 py-2.5 text-sm rounded-lg transition ${getAccountStatus(student) !== 'Active' ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                           {getAccountStatus(student) !== 'Active' ? 'Activate Account' : 'Deactivate Account'}
                         </button>
                         <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-2"></div>
                         <button onClick={() => { setActiveDropdown(null); handleDelete(student.id); }} className="text-left w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition">Delete Permanently</button>
                       </div>
                     )}
                   </div>
                 </td>
               </tr>
            ))}
            {filteredStudents.length === 0 && <tr><td colSpan="10" className="p-8 text-center text-slate-400 italic">No students match your filter criteria.</td></tr>}
          </tbody>
        </table>
      </div>

      {clearanceModal && (
        <EditClearanceModal student={clearanceModal} offices={offices} onClose={() => setClearanceModal(null)} onConfirm={handleConfirmClearance} />
      )}

      {showModal && (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 my-auto">
            <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-white">{editingId ? 'Edit Student Account' : 'Add New Student Account'}</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Modify demographic data, login credentials, or official status.</p>
            
            <div className="flex flex-col gap-6 mb-8 text-slate-800 dark:text-slate-200">
              
              {/* Identity Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                {!editingId && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">School ID</label>
                    <input type="text" placeholder="Enter strictly unique ID..." value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-[#092B9C] focus:ring-1 focus:ring-[#092B9C] transition shadow-sm font-medium" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">First Name</label>
                  <input type="text" placeholder="First Name" value={formData.firstname} onChange={e => setFormData({ ...formData, firstname: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-[#092B9C] focus:ring-1 focus:ring-[#092B9C] transition shadow-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Last Name</label>
                  <input type="text" placeholder="Last Name" value={formData.lastname} onChange={e => setFormData({ ...formData, lastname: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-[#092B9C] focus:ring-1 focus:ring-[#092B9C] transition shadow-sm font-medium" />
                </div>
                <div className="sm:col-span-2 mt-[-4px]">
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Middle Name <span className="text-[10px] text-slate-400 font-normal lowercase">(Optional)</span></label>
                  <input type="text" placeholder="Middle Name" value={formData.middlename} onChange={e => setFormData({ ...formData, middlename: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-[#092B9C] focus:ring-1 focus:ring-[#092B9C] transition shadow-sm font-medium" />
                </div>
              </div>

              {/* Demographics Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Date of Birth</label>
                  <input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-[#092B9C] focus:ring-1 focus:ring-[#092B9C] transition shadow-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-[#092B9C] focus:ring-1 focus:ring-[#092B9C] transition shadow-sm font-medium">
                    <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Academics Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase text-blue-800 dark:text-blue-300 mb-1.5">Academic Course</label>
                  <select value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm font-bold text-blue-900 dark:text-blue-100">
                    <option value="" disabled>Select Enrolled Course</option>
                    {courses.map(c => <option key={c.id} value={c.code}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 mt-[-4px]">
                  <label className="block text-xs font-black uppercase text-blue-800 dark:text-blue-300 mb-1.5">Year Level</label>
                  <select value={formData.yearLevel} onChange={e => setFormData({ ...formData, yearLevel: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm font-medium">
                    <option value="">Select Current Year</option>
                    {yearLevels.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Security Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Recovery Email</label>
                  <input type="email" placeholder="student@university.edu" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300 transition shadow-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Secret Password</label>
                  <input type="text" placeholder="Assign highly secure password..." value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300 transition shadow-sm font-medium" />
                </div>
              </div>

            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-xl shadow-md hover:bg-blue-800 transition">{editingId ? 'Save Changes' : 'Create Account'}</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Edit Days Modal */}
      {extendModal && (
        <EditDaysModal student={extendModal} onClose={() => setExtendModal(null)} onConfirm={handleConfirmExtend} />
      )}

    </Card>
  );
};

export default StudentsPage;
