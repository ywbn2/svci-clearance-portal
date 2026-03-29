import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import { Modal, ModalPortal } from '../../components/Navigation';

const DepartmentsPage = () => {
  const { departments, setDepartments, courses, students, setStudents, signatories, setSignatories, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [oldDeptCode, setOldDeptCode] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  
  const [assigningDept, setAssigningDept] = useState(null);
  const [assignedCourses, setAssignedCourses] = useState([]);

  const handleOpenModal = (d = null) => {
    setEditingDeptId(d ? d.id : null);
    setOldDeptCode(d ? d.code : null);
    setDeptName(d ? d.name : '');
    setDeptCode(d ? d.code : '');
    setShowModal(true);
  };

  const handleSaveDept = async () => {
    const nameTrimmed = deptName.trim();
    const codeTrimmed = deptCode.trim();
    if (!nameTrimmed || !codeTrimmed) return showToast("Short Code and Full Name are strictly required.", "error");

    if (!editingDeptId && departments.some(d => (d.code || '').toLowerCase() === codeTrimmed.toLowerCase())) {
        return showToast("A department with this code already exists.", "error");
    }

    setShowModal(false); // Instant Validation

    if (editingDeptId) {
      const rollback = [...departments];
      const rollbackStudents = [...students];

      setDepartments(departments.map(d => d.id === editingDeptId ? { ...d, name: nameTrimmed, code: codeTrimmed } : d));
      setStudents(students.map(s => s.department === oldDeptCode ? {...s, department: codeTrimmed} : s));

      if (oldDeptCode && oldDeptCode !== codeTrimmed) {
        supabase.from('students').update({ dept: codeTrimmed }).eq('dept', oldDeptCode || null).then();
        supabase.from('signatories').update({ dept_code: codeTrimmed }).eq('dept_code', oldDeptCode || null).then();
        // Also update local signatories state so the page reflects new dept code immediately
        if (setSignatories) setSignatories(prev => prev.map(s => s.dept_code === oldDeptCode ? { ...s, dept_code: codeTrimmed } : s));
      }

      supabase.from('departments').update({ name: nameTrimmed, code: codeTrimmed }).eq('id', editingDeptId).then(({error}) => {
        if (error) {
          setDepartments(rollback);
          setStudents(rollbackStudents);
          showToast("Failed to update department: " + error.message, "error");
        } else {
          showToast("Department updated!");
        }
      });
    } else {
      const tempId = Math.random().toString(36).substring(2, 9);
      const tempDept = { id: tempId, name: nameTrimmed, code: codeTrimmed, assignedCourses: [] };
      const rollback = [...departments];
      setDepartments([...departments, tempDept]);

      supabase.from('departments').insert([{ name: nameTrimmed, code: codeTrimmed }]).select().then(({data, error}) => {
        if (error || !data || data.length === 0) {
          setDepartments(rollback);
          showToast("Failed to create department.", "error");
        } else {
          setDepartments([...rollback, { id: data[0].id, name: nameTrimmed, code: codeTrimmed, assignedCourses: [] }]);
          showToast(`Department '${codeTrimmed}' created!`);
          if (logAction) logAction(currentUser, 'Added Department', `Created department: ${nameTrimmed} (${codeTrimmed})`);
        }
      });
    }
  };

  const handleDelete = async (deptObj) => {
    if (await showConfirm(`Delete ${deptObj.code}?`)) {
      const rollbackDepts = [...departments];
      const rollbackStudents = [...students];

      setDepartments(departments.filter(d => d.id !== deptObj.id));
      setStudents(students.map(s => s.department === deptObj.code ? {...s, department: 'Unassigned'} : s));

      try {
        await supabase.from('department_courses').delete().eq('department_id', deptObj.id);
        await supabase.from('students').update({ dept: 'Unassigned' }).eq('dept', deptObj.code);
        await supabase.from('signatories').update({ dept_code: 'Unassigned' }).eq('dept_code', deptObj.code);
        await supabase.from('departments').delete().eq('id', deptObj.id);
        showToast(`Department '${deptObj.code}' deleted.`, "error");
        if (logAction) logAction(currentUser, 'Deleted Department', `Removed department: ${deptObj.name} (${deptObj.code})`);
      } catch (err) {
        setDepartments(rollbackDepts);
        setStudents(rollbackStudents);
        showToast(`Failed to delete: ${err.message}`, "error");
      }
    }
  };

  const handleOpenAssignModal = (dept) => {
    setAssigningDept(dept);
    setAssignedCourses(dept.assignedCourses || []);
    setShowAssignModal(true);
  };

  const handleToggleAssign = (course) => {
    if (assignedCourses.includes(course)) setAssignedCourses(assignedCourses.filter(c => c !== course));
    else setAssignedCourses([...assignedCourses, course]);
  };

  const handleSaveAssign = async () => {
    await supabase.from('department_courses').delete().eq('department_id', assigningDept.id);
    if (assignedCourses.length > 0) {
      const inserts = assignedCourses.map(c => ({ department_id: assigningDept.id, course_name: c }));
      await supabase.from('department_courses').insert(inserts);
    }

    const previousCourses = assigningDept.assignedCourses || [];
    const removedCourses = previousCourses.filter(c => !assignedCourses.includes(c));
    const addedCourses = assignedCourses.filter(c => !previousCourses.includes(c));

    // Fire safety sync to resolve orphaned students automatically
    if (removedCourses.length > 0) {
      await supabase.from('students').update({ dept: 'Unassigned' }).in('course', removedCourses);
    }
    if (addedCourses.length > 0) {
      await supabase.from('students').update({ dept: assigningDept.code }).in('course', addedCourses);
    }

    // Cascade visuals directly without latency
    setStudents(students.map(s => {
      if (removedCourses.includes(s.course)) return { ...s, department: 'Unassigned' };
      if (addedCourses.includes(s.course)) return { ...s, department: assigningDept.code };
      return s;
    }));

    setDepartments(departments.map(d => d.id === assigningDept.id ? { ...d, assignedCourses } : d));
    setShowAssignModal(false);
    showToast("Academic course assignment saved! Existing students resynchronized.");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Department Configuration</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage departments and assign courses mapped to them</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-[#092B9C] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow-md">+ Add Department</button>
      </div>

      <div className="w-full border dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-900/80 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700 text-slate-800 dark:text-slate-200">
            <tr>
              <th className="p-4 w-32">Code</th>
              <th className="p-4">Full Name</th>
              <th className="p-4 w-72">Assigned Courses</th>
              <th className="p-4 w-40 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-300">
            {departments.map((d) => (
              <tr key={d.id} className="border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition align-middle">
                <td className="p-4 align-middle">
                  <span className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-400 px-3 py-1.5 rounded-lg text-xs font-black tracking-wide">{d.code}</span>
                </td>
                <td className="p-4 font-bold text-slate-800 dark:text-white align-middle">{d.name}</td>
                <td className="p-4 align-middle">
                  <div className="flex flex-nowrap gap-1.5 overflow-x-auto" style={{scrollbarWidth:'none', msOverflowStyle:'none'}}>
                    {d.assignedCourses.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">None</span>
                    ) : (
                      d.assignedCourses.map(c => (
                        <span key={c} className="inline-flex items-center shrink-0 bg-blue-50 text-[#092B9C] dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-black border border-blue-100 dark:border-blue-800 whitespace-nowrap">
                          {c}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => handleOpenAssignModal(d)} title="Assign Courses" className="py-1.5 px-3 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition">Assign</button>
                    <button onClick={() => handleOpenModal(d)} title="Edit" className="py-1.5 px-3 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-[#092B9C] dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition">Edit</button>
                    <button onClick={() => handleDelete(d)} title="Delete" className="py-1.5 px-3 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition">Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400 italic">No departments added yet. Click &quot;+ Add Department&quot; to create one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 transform transition-opacity duration-200 ease-in-out">
            <h2 className="text-xl font-black mb-4 text-slate-800 dark:text-white">{editingDeptId ? 'Edit Department' : 'Add Department'}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Short Code</label>
                <input type="text" placeholder="e.g. CCS, CENG" value={deptCode} onChange={e=>setDeptCode(e.target.value)} autoFocus className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Full Name</label>
                <input type="text" placeholder="e.g. College of Computer Studies" value={deptName} onChange={e=>setDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveDept()} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              <button onClick={handleSaveDept} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-xl shadow-md hover:bg-blue-800 transition">Save</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showAssignModal && assigningDept && (() => {
        // Build a set of courses taken by OTHER departments
        const takenByOther = new Set(
          departments
            .filter(d => d.id !== assigningDept.id)
            .flatMap(d => d.assignedCourses)
        );
        return (
          <ModalPortal>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.20)] border border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-xl font-black mb-1 text-slate-800 dark:text-white">Assign Courses</h2>
              <p className="text-slate-500 text-sm mb-5">Tap a course card to toggle assignment for <span className="font-bold text-slate-700 dark:text-white">{assigningDept.name}</span></p>

              {courses.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-6">No courses configured globally.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
                  {courses.map(c => {
                    const isAssignedHere = assignedCourses.includes(c.code);
                    const isTaken = takenByOther.has(c.code);
                    return (
                      <button
                        key={c.code}
                        onClick={() => !isTaken && handleToggleAssign(c.code)}
                        disabled={isTaken}
                        className={`relative flex flex-row items-center gap-3 px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all duration-150 text-left w-full
                          ${isTaken
                            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                            : isAssignedHere
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#092B9C] hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
                          }`}
                      >
                        <BookIcon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 leading-tight">{c.code}</span>
                        {isTaken && (
                          <span className="shrink-0 text-[9px] font-black bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">Taken</span>
                        )}
                        {isAssignedHere && !isTaken && (
                          <span className="shrink-0 text-[9px] font-black bg-emerald-400 text-white px-1.5 py-0.5 rounded">✓ On</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
                <button onClick={handleSaveAssign} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-xl shadow-md hover:bg-blue-800 transition">Apply Assignment</button>
              </div>
            </div>
          </div>
          </ModalPortal>
        );
      })()}
    </div>
  );
};

export default DepartmentsPage;
