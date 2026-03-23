import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { Modal, ModalPortal } from '../../components/Navigation';

const CoursesPage = () => {
  const { courses, setCourses, departments, setDepartments, students, setStudents, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [oldCourseCode, setOldCourseCode] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');

  const handleOpenModal = (c = null) => {
    setEditingCourseId(c ? c.id : null);
    setOldCourseCode(c ? c.code : null);
    setCourseName(c ? c.name : '');
    setCourseCode(c ? c.code : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    const nameTrimmed = courseName.trim();
    const codeTrimmed = courseCode.trim();
    if (!nameTrimmed || !codeTrimmed) return showToast('Both name and code are required.', 'error');
    if (!editingCourseId && courses.some(c => c.code?.toLowerCase() === codeTrimmed.toLowerCase())) {
        return showToast('A course with that short code already exists.', 'error');
    }

    setShowModal(false); // Instant response

    if (editingCourseId) {
      if (oldCourseCode && oldCourseCode !== codeTrimmed) {
        await supabase.from('department_courses').update({ course_name: codeTrimmed }).eq('course_name', oldCourseCode);
        await supabase.from('students').update({ course: codeTrimmed }).eq('course', oldCourseCode);
      }

      const rollback = [...courses];
      setCourses(courses.map(c => c.id === editingCourseId ? { ...c, name: nameTrimmed, code: codeTrimmed } : c));
      setDepartments(departments.map(d => ({
        ...d, assignedCourses: d.assignedCourses.map(ac => ac === oldCourseCode ? codeTrimmed : ac)
      })));
      setStudents(students.map(s => s.course === oldCourseCode ? { ...s, course: codeTrimmed } : s));

      supabase.from('courses').update({ name: nameTrimmed, code: codeTrimmed }).eq('id', editingCourseId).then(({error}) => {
        if (error) {
          setCourses(rollback);
          showToast('Failed to update course: ' + (error.message || error.code), 'error');
        } else {
          showToast('Course updated successfully!', 'success');
          logAction(currentUser, 'Edited Course', `Updated course: ${nameTrimmed} (${codeTrimmed})`);
        }
      });
    } else {
      const tempId = Math.random().toString(36).substring(2, 9);
      const newCourse = { id: tempId, name: nameTrimmed, code: codeTrimmed };
      const rollback = [...courses];
      setCourses([...courses, newCourse]);
      
      supabase.from('courses').insert([{ name: nameTrimmed, code: codeTrimmed }]).select('id, name, code').single().then(({data, error}) => {
        if (error) {
          setCourses(rollback);
          showToast('Failed to add course.', 'error');
        } else {
          setCourses([...rollback, data]);
          showToast(`Course '${codeTrimmed}' added!`, 'success');
          logAction(currentUser, 'Added Course', `Added course: ${nameTrimmed} (${codeTrimmed})`);
        }
      });
    }
  };

  const handleDelete = async (c) => {
    if (await showConfirm(`Delete '${c.code}'? This removes it from departments and leaves assigned students without a valid course.`)) {
      const rollbackCourses = [...courses];
      const rollbackDepts = [...departments];
      const rollbackStudents = [...students];

      setCourses(courses.filter(co => co.id !== c.id));
      setDepartments(departments.map(d => ({ ...d, assignedCourses: d.assignedCourses.filter(ac => ac !== c.code) })));
      setStudents(students.map(s => s.course === c.code ? { ...s, course: 'Unassigned' } : s));

      try {
        await supabase.from('department_courses').delete().eq('course_name', c.code);
        await supabase.from('students').update({ course: 'Unassigned' }).eq('course', c.code);
        await supabase.from('courses').delete().eq('id', c.id);
        
        showToast(`Course '${c.code}' removed.`, 'error');
        logAction(currentUser, 'Deleted Course', `Removed course: ${c.code}`);
      } catch (err) {
        setCourses(rollbackCourses);
        setDepartments(rollbackDepts);
        setStudents(rollbackStudents);
        showToast('Failed to delete course: ' + err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Courses Configuration</h2>
          <p className="text-slate-500 dark:text-slate-400">Add, edit, or remove available courses · <span className="font-bold text-[#092B9C] dark:text-blue-400">{courses.length} total</span></p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-[#092B9C] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-800 transition shadow-md flex items-center gap-2"><span className="text-lg leading-none">+</span> Add Course</button>
      </div>

      {courses.length === 0 ? (
        <Card><p className="text-center text-slate-500 py-8">No courses configured yet. Click &quot;Add Course&quot; to get started.</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.map(c => (
            <div key={c.id} className="group bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#092B9C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col gap-3">
              {/* Code badge */}
              <div className="flex items-start justify-between gap-2">
                <span className="bg-[#092B9C]/10 text-[#092B9C] dark:bg-blue-900/40 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase">{c.code}</span>
              </div>
              {/* Full name */}
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug flex-1">{c.name}</p>
              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => handleOpenModal(c)} className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-[#092B9C] dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition">Edit</button>
                <button onClick={() => handleDelete(c)} className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 transform transition-opacity duration-200 ease-in-out">
            <h2 className="text-xl font-black mb-4 text-slate-800 dark:text-white">{editingCourseId ? `Edit Course` : 'Add Course'}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Short Code</label>
                <input type="text" placeholder="e.g. BSCS, BSED" value={courseCode} onChange={e => setCourseCode(e.target.value)} autoFocus className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Full Name</label>
                <input type="text" placeholder="e.g. Bachelor of Science in Computer Science" value={courseName} onChange={e => setCourseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-xl shadow-md hover:bg-blue-800 transition">Save</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default CoursesPage;
