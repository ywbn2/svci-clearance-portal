import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, CalendarIcon, UserIcon, KeyIcon, LogOutIcon, EyeIcon, EyeOffIcon, PlusIcon, SaveIcon, Trash2Icon, FileSignatureIcon, UploadIcon, DownloadIcon, ChevronRightIcon, SearchIcon, MenuIcon, XIcon, SettingsIcon } from '../../icons';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { Modal, ModalPortal } from '../../components/Navigation';
import { getScopedOfficeName } from '../../utils/helpers';

const SignatoriesPage = () => {
  const { offices, setOffices, officeCategories, setOfficeCategories, signatories, setSignatories, departments, students, setStudents, requirements, setRequirements, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOffice, setNewOffice] = useState('');
  const [newOfficeCategory, setNewOfficeCategory] = useState('School Clearance');
  const [showSigModal, setShowSigModal] = useState(false);
  const [editingSigId, setEditingSigId] = useState(null);
  const [sigFormData, setSigFormData] = useState({ email: '', password: '', office: '', secret_key: '', role: 'Staff', dept_code: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [editingCategory, setEditingCategory] = useState('School Clearance');
  const [editingOfficeName, setEditingOfficeName] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  const handleAddOffice = async () => {
    const trimmed = newOffice.trim();
    if (trimmed) {
      const isDuplicate = offices.some(o => o.toLowerCase() === trimmed.toLowerCase());
      if (isDuplicate) {
        showToast(`The office '${trimmed}' already exists!`, 'error');
      } else {
        const newOffices = [...offices, trimmed];
        const newCats = { ...officeCategories, [trimmed]: newOfficeCategory };
        setOffices(newOffices);
        setOfficeCategories(newCats);
        await supabase.from('app_settings').update({ offices: newOffices, office_categories: newCats }).eq('id', 1);
        setNewOffice(''); setShowAddOffice(false);
        showToast(`Office '${trimmed}' added!`);
      }
    }
  };
  const handleDeleteOffice = async (officeName) => {
    if (await showConfirm(`Are you sure you want to delete the ${officeName} office? Signatories assigned here will become Unassigned.`)) {
      const rollbackOffices = [...offices];
      const rollbackCats = { ...officeCategories };
      const rollbackSigs = [...signatories];

      const newOffices = offices.filter(o => o !== officeName);
      const newCats = { ...officeCategories };
      delete newCats[officeName];
      
      setOffices(newOffices);
      setOfficeCategories(newCats);
      setSignatories(signatories.map(s => s.office === officeName ? { ...s, office: 'Unassigned' } : s));

      try {
        await supabase.from('signatories').update({ office: 'Unassigned' }).eq('office', officeName);
        await supabase.from('requirements').delete().eq('office', officeName);
        await supabase.from('app_settings').update({ offices: newOffices, office_categories: newCats }).eq('id', 1);
        
        // CLEANUP: Remove this office key from all students' records
        const studentsToCleanup = students.filter(s => s.office_clearances && s.office_clearances[officeName]);
        if (studentsToCleanup.length > 0) {
          const cleanupPromises = studentsToCleanup.map(s => {
            const nextClearances = { ...s.office_clearances };
            delete nextClearances[officeName];
            return supabase.from('students').update({ office_clearances: nextClearances }).eq('id', s.id);
          });
          await Promise.all(cleanupPromises);
          setStudents(prev => prev.map(s => {
            if (s.office_clearances && s.office_clearances[officeName]) {
              const next = { ...s.office_clearances };
              delete next[officeName];
              return { ...s, office_clearances: next };
            }
            return s;
          }));
        }

        setRequirements(requirements.filter(r => r.office !== officeName));
        showToast(`Office '${officeName}' removed.`, "error");
      } catch (err) {
        setOffices(rollbackOffices);
        setOfficeCategories(rollbackCats);
        setSignatories(rollbackSigs);
        showToast(`Deletion failed: ${err.message}`, "error");
      }
    }
  };

  const handleSaveOfficeCategory = async (officeName) => {
    const newName = editingOfficeName.trim() || officeName;
    if (!newName) return showToast("Office name cannot be empty", "error");
    
    const nameChanged = newName !== officeName;
    // Rename in offices array if needed
    const newOffices = nameChanged ? offices.map(o => o === officeName ? newName : o) : offices;
    // Migrate category key if name changed
    const newCats = { ...officeCategories };
    if (nameChanged) {
      newCats[newName] = editingCategory;
      delete newCats[officeName];
    } else {
      newCats[officeName] = editingCategory;
    }
    
    setOffices(newOffices);
    setOfficeCategories(newCats);
    setIsMigrating(true);

    try {
      await supabase.from('app_settings').update({ offices: newOffices, office_categories: newCats }).eq('id', 1);
      
      // Also update any signatories assigned to the old office name
      if (nameChanged) {
        await supabase.from('signatories').update({ office: newName }).eq('office', officeName);
        await supabase.from('requirements').update({ office: newName }).eq('office', officeName);
        
        // CRITICAL: Migrate student clearance keys
        const studentsToUpdate = students.filter(s => s.office_clearances && s.office_clearances[officeName]);
        if (studentsToUpdate.length > 0) {
          const updates = studentsToUpdate.map(s => {
            const nextClearances = { ...s.office_clearances };
            nextClearances[newName] = nextClearances[officeName];
            delete nextClearances[officeName];
            return supabase.from('students').update({ office_clearances: nextClearances }).eq('id', s.id);
          });
          await Promise.all(updates);
          
          setStudents(prev => prev.map(s => {
            if (s.office_clearances && s.office_clearances[officeName]) {
              const next = { ...s.office_clearances };
              next[newName] = next[officeName];
              delete next[officeName];
              return { ...s, office_clearances: next };
            }
            return s;
          }));
        }

        setSignatories(signatories.map(s => s.office === officeName ? { ...s, office: newName } : s));
        setRequirements(requirements.map(r => r.office === officeName ? { ...r, office: newName } : r));
      }
      showToast(`Office '${newName}' updated!`);
    } catch (err) {
      showToast("Sync Error: " + err.message, "error");
    } finally {
      setEditingOffice(null);
      setIsMigrating(false);
    }
  };

  const handleOpenSigModal = (sig = null) => {
    setShowPassword(false);
    if (sig) {
      setEditingSigId(sig.id);
      setSigFormData({ email: sig.email, password: sig.password || '', office: sig.office, secret_key: sig.secret_key || '', role: sig.role || 'Staff', dept_code: sig.dept_code || '' });
    } else {
      setEditingSigId(null);
      setSigFormData({ email: '', password: '', office: '', secret_key: '', role: 'Dept. Dean', dept_code: '' });
    }
    setShowSigModal(true);
  };

  const handleSaveSignatory = async () => {
    if (sigFormData.email && sigFormData.password && sigFormData.office && sigFormData.secret_key) {
      const isDeptSpecific = ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sigFormData.office);
      const needsDept = sigFormData.role === 'Dept. Dean' || isDeptSpecific;

      if (needsDept && !sigFormData.dept_code) {
        return showToast(sigFormData.role === 'Dept. Dean' ? 'A Dept. Dean must be assigned to a Department.' : `The ${sigFormData.office} must be assigned to a specific Department.`, 'error');
      }

      const isEmailTaken = signatories.some(s => s.email.toLowerCase() === sigFormData.email.toLowerCase() && s.id !== editingSigId);
      if (isEmailTaken) return showToast(`The email '${sigFormData.email}' is already registered!`, 'error');
      
      // We no longer strictly block duplicating the "office" if it's a department-specific office, BUT we must block if the SAME office + dept_code exists!
      const isOfficeTaken = signatories.some(s => s.office === sigFormData.office && (!isDeptSpecific || s.dept_code === sigFormData.dept_code) && s.id !== editingSigId);
      if (isOfficeTaken) {
        return showToast(isDeptSpecific ? `There is already a ${sigFormData.office} assigned to ${sigFormData.dept_code}!` : `The '${sigFormData.office}' office already has an assigned signatory!`, 'error');
      }

      const dataToSave = { ...sigFormData, dept_code: needsDept ? sigFormData.dept_code : null };
      setShowSigModal(false);

      if (editingSigId) {
        const rollback = [...signatories];
        setSignatories(signatories.map(s => s.id === editingSigId ? { ...s, ...dataToSave } : s));
        const { error } = await supabase.from('signatories').update(dataToSave).eq('id', editingSigId);
        if (error) {
          setSignatories(rollback);
          return showToast(`Failed to update DB: ${error.message}`, 'error');
        }
        showToast("Signatory profile updated!"); logAction(currentUser, 'Edited Signatory', `Updated signatory: ${sigFormData.email}`);
      } else {
        const newId = crypto.randomUUID();
        const newSig = { id: newId, ...dataToSave };
        const rollback = [...signatories];
        setSignatories([...signatories, newSig]);
        const { error } = await supabase.from('signatories').insert([newSig]);
        if (error) {
          setSignatories(rollback);
          return showToast(`Failed to insert into DB: ${error.message}`, 'error');
        }
        showToast("New signatory account created!"); logAction(currentUser, 'Added Signatory', `Created signatory account: ${sigFormData.email}`);
      }
    } else {
      showToast("Please fill out all required fields including the Secret Key.", "error");
    }
  };
  const handleDeleteSignatory = async (id) => {
    if (await showConfirm("Are you sure you want to remove this account? All requirements they posted and clearances they processed will be completely revoked.")) {
      try {
        const sig = signatories.find(s => s.id === id);
        if (!sig) return;

        const rollbackSigs = [...signatories];
        const rollbackReqs = [...requirements];
        const rollbackStudents = [...students];

        setSignatories(signatories.filter(s => s.id !== id));
        setRequirements(requirements.filter(r => r.office !== sig.office && r.author !== sig.email));

        const isDeptSpecific = ['Dept. Dean', 'Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sig.role) || ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sig.office);
        const targetStudents = isDeptSpecific && sig.dept_code 
          ? students.filter(s => (s.dept || '').trim().toLowerCase() === (sig.dept_code || '').trim().toLowerCase())
          : students;

        if (targetStudents.length > 0) {
          setStudents(students.map(s => {
            if (targetStudents.some(ts => ts.id === s.id)) {
              const newClearances = { ...(s.office_clearances || {}) };
              delete newClearances[sig.office];
              return { ...s, office_clearances: newClearances };
            }
            return s;
          }));
        }

        // Apply to DB after optimistic update
        await supabase.from('requirements').delete().eq('office', sig.office || '');
        if (sig.email) {
          await supabase.from('requirements').delete().eq('author', sig.email);
        }

        if (targetStudents.length > 0) {
          const updates = targetStudents.map(s => {
            const newClearances = { ...(s.office_clearances || {}) };
            delete newClearances[sig.office];
            return supabase.from('students').update({ office_clearances: newClearances }).eq('id', s.id);
          });
          await Promise.all(updates);
        }

        await supabase.from('signatories').delete().eq('id', id);
        
        showToast("Account deleted and all associated data revoked.", "error"); 
        logAction(currentUser, 'Deleted Signatory', `Removed account and wiped cascade data for: ${sig.email}`);
      } catch (err) {
        // Handle rollbacks if network error
        setSignatories(rollbackSigs);
        setRequirements(rollbackReqs);
        setStudents(rollbackStudents);
        console.error("Deletion crash:", err);
        showToast(`Deletion Error: ${err.message}`, "error");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">Signatories &amp; Offices</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage clearance offices and their assigned personnel</p>
      </div>

      {/* ── Clearance Offices Section ── */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Clearance Offices</h3>
          <button onClick={() => setShowAddOffice(true)} className="bg-[#092B9C] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-800 transition shadow-sm">+ Add Office</button>
        </div>
        {offices.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 italic text-sm text-center py-8">No offices have been added yet. Click "Add Office" to get started.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {offices.map((office, idx) => (
              <div key={idx} className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 p-3 flex flex-col gap-2">
                {editingOffice === office ? (
                  <div className="space-y-2 animate-fade-in">
                    <input
                      type="text"
                      value={editingOfficeName}
                      onChange={e => setEditingOfficeName(e.target.value)}
                      className="w-full p-1.5 text-xs border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] font-bold"
                      placeholder="Office name"
                    />
                    <select
                      value={editingCategory}
                      onChange={e => setEditingCategory(e.target.value)}
                      className="w-full p-1.5 text-xs border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]"
                    >
                      <option value="School Clearance">School Clearance</option>
                      <option value="SSG Clearance">SSG Clearance</option>
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => handleSaveOfficeCategory(office)} className="flex-1 py-1 bg-[#092B9C] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition">Save</button>
                      <button onClick={() => setEditingOffice(null)} className="flex-1 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300 transition">✕</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2 min-w-0">
                      <BuildingIcon className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight truncate" title={office}>{office}</p>
                        <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${officeCategories[office] === 'SSG Clearance' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {officeCategories[office] || 'School'}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{signatories.filter(s => s.office === office).length} staff</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-auto pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => { setEditingOffice(office); setEditingCategory(officeCategories[office] || 'School Clearance'); setEditingOfficeName(office); }}
                        className="flex-1 flex items-center justify-center p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                        title="Edit Category"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteOffice(office)}
                        className="flex-1 flex items-center justify-center p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                        title="Delete Office"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Registered Accounts Section ── */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Registered Accounts</h3>
          <button onClick={() => handleOpenSigModal()} className="bg-[#092B9C] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow-sm">+ Add Account</button>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-800 dark:text-blue-300 p-4 rounded-r-xl text-sm mb-6 flex items-start gap-3">
          <ShieldIcon className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
          <div>
            <p className="font-bold mb-1">Department Scoping Rules</p>
            <p className="opacity-90">Signatories assigned as a <strong>Dean</strong>, <strong>Dept. Treasurer</strong>, <strong>Dept. Governor</strong>, or <strong>Dept. Adviser</strong> are strictly bound to their respective departments. They will only process clearances for students enrolled in that specific department.</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {(() => {
            const groupedSignatories = signatories.reduce((acc, sig) => {
              let group = 'School Clearance';
              if (['Dept. Dean', 'Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sig.role) || 
                  ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sig.office)) {
                if (sig.dept_code) {
                  group = `${sig.dept_code} Department`;
                }
              } else if (officeCategories[sig.office]) {
                group = officeCategories[sig.office];
              }
              if (!acc[group]) acc[group] = [];
              acc[group].push(sig);
              return acc;
            }, {});

            const sortedGroups = Object.keys(groupedSignatories).sort((a,b) => {
              if (a.includes('Department') && !b.includes('Department')) return -1;
              if (!a.includes('Department') && b.includes('Department')) return 1;
              return a.localeCompare(b);
            });

            if (sortedGroups.length === 0) {
              return <div className="text-center p-8 border dark:border-slate-700 rounded-lg text-slate-500 bg-slate-50 dark:bg-slate-800/30">No accounts registered yet.</div>;
            }

            return sortedGroups.map(group => (
              <div key={group} className="overflow-x-auto border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow-sm animate-fade-in">
                <div className="bg-slate-100 dark:bg-slate-900/80 p-4 border-b dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                    {group.includes('Department') ? <BuildingIcon className="w-4 h-4 text-violet-500" /> : <FileCheckIcon className="w-4 h-4 text-blue-500" />}
                    {group}
                  </h3>
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold">
                    {groupedSignatories[group].length} ACCOUNT{groupedSignatories[group].length !== 1 ? 'S' : ''}
                  </span>
                </div>
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 border-b dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                    <tr><th className="p-4 font-bold">Email</th><th className="p-4 font-bold">Role</th><th className="p-4 font-bold">Office</th><th className="p-4 font-bold">Secret Key</th><th className="p-4 font-bold text-center">Actions</th></tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-300">
                    {groupedSignatories[group].map((sig, idx) => (
                      <tr key={idx} className="border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-4 text-slate-700 dark:text-slate-200">{sig.email}</td>
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`py-1 px-2 rounded-md text-xs font-bold ${sig.role === 'Dept. Dean' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                              {sig.role || 'Staff'}
                            </span>
                            {sig.role === 'Dept. Dean' || ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sig.office) ? (
                              sig.dept_code ? (
                                <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-0.5 rounded text-[10px] font-black">
                                  {sig.dept_code}
                                </span>
                              ) : null
                            ) : null}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 py-1 px-2 rounded-md text-xs font-bold">
                              {getScopedOfficeName(sig.office, sig.dept_code)}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{officeCategories[sig.office] || 'School Clearance'}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-500">{sig.secret_key || '—'}</td>
                        <td className="p-4 text-center space-x-3">
                          <button onClick={() => handleOpenSigModal(sig)} className="text-[#092B9C] dark:text-blue-400 font-bold hover:underline">Edit</button>
                          <button onClick={() => handleDeleteSignatory(sig.id)} className="text-rose-500 font-bold hover:underline">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ));
          })()}
        </div>
      </Card>

      {showAddOffice && (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 transform transition-opacity duration-200 ease-in-out">
            <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-white">Add New Office</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">Create a new clearance office.</p>
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase">Existing Offices</span>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                {offices.map(o => <span key={o} className="text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded truncate max-w-[200px]" title={o}>{o}</span>)}
                {offices.length === 0 && <span className="text-xs italic text-slate-400">No offices currently exist.</span>}
              </div>
            </div>
            <input type="text" placeholder="e.g. Guidance Counselor" value={newOffice} onChange={e => setNewOffice(e.target.value)} className="w-full p-3 mb-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 mb-1">Office Category</label>
              <select value={newOfficeCategory} onChange={e => setNewOfficeCategory(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]">
                <option value="School Clearance">School Clearance</option>
                <option value="SSG Clearance">SSG Clearance</option>
              </select>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAddOffice(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              <button onClick={handleAddOffice} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-xl shadow-md hover:bg-blue-800 transition">Save Office</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {showSigModal && (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 transform transition-opacity duration-200 ease-in-out">
            <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-white">{editingSigId ? 'Edit Signatory' : 'Add Signatory Account'}</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{editingSigId ? 'Update signatory details.' : 'Create a new personnel account and assign to an office.'}</p>
            <div className="space-y-4 mb-6">
              <input type="email" placeholder="Email Address" value={sigFormData.email} onChange={e => setSigFormData({...sigFormData, email: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={sigFormData.password} onChange={e => setSigFormData({...sigFormData, password: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] pr-16" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Role</label>
                <select value={sigFormData.role} onChange={e => {
                  const newRole = e.target.value;
                  const isDeptRole = ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(newRole);
                  setSigFormData({...sigFormData, role: newRole, dept_code: '', office: isDeptRole ? newRole : sigFormData.office});
                }} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]">
                  <optgroup label="Department Scoped Roles" className="font-black text-[#092B9C] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">
                    <option value="Dept. Dean" className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900">Dept. Dean</option>
                    <option value="Dept. Treasurer" className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900">Dept. Treasurer</option>
                    <option value="Dept. Governor" className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900">Dept. Governor</option>
                    <option value="Dept. Adviser" className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900">Dept. Adviser</option>
                  </optgroup>
                  <optgroup label="Global Roles" className="font-black text-slate-500 bg-slate-100 dark:bg-slate-800">
                    <option value="Admin" className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900">Admin</option>
                  </optgroup>
                </select>
              </div>

              {!['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sigFormData.role) && (
                <select value={sigFormData.office} onChange={e => setSigFormData({...sigFormData, office: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]">
                <option value="" disabled>Select Office</option>
                {offices.map(o => {
                  const assignedSig = signatories.find(s => s.office === o);
                  const isDeptSpecific = ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(o);
                  const isTakenHere = !isDeptSpecific && assignedSig && assignedSig.id !== editingSigId;
                  return (
                    <option key={o} value={o} disabled={isTakenHere} className={isTakenHere ? "italic text-slate-400" : "font-bold"}>
                      {o} {isTakenHere ? `(Assigned to ${assignedSig.name})` : ''}
                    </option>
                  );
                })}
              </select>
              )}

              {/* Department — only shown for Dept. Dean or specific Offices */}
              {(sigFormData.role === 'Dept. Dean' || ['Dept. Treasurer', 'Dept. Governor', 'Dept. Adviser'].includes(sigFormData.office)) && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 space-y-2 animate-fade-in">
                  <label className="block text-sm font-black text-emerald-700 dark:text-emerald-400">Assign to Department <span className="text-rose-500">*</span></label>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">This account will only see and process requests from students within this department.</p>
                  <select value={sigFormData.dept_code} onChange={e => setSigFormData({...sigFormData, dept_code: e.target.value})} className="w-full p-3 border border-emerald-300 dark:border-emerald-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="" disabled>Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.code}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
              )}
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-xl p-4 space-y-2">
                <label className="block text-sm font-black text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <KeyIcon className="w-4 h-4"/> Secret Key <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-amber-600 dark:text-amber-500">This key will be required every time the signatory approves a student's clearance.</p>
                <input type="text" placeholder="e.g. SIGN-2024-LIB" value={sigFormData.secret_key} onChange={e => setSigFormData({...sigFormData, secret_key: e.target.value})} className="w-full p-3 border border-amber-300 dark:border-amber-600 rounded-xl bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest" />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowSigModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              <button onClick={handleSaveSignatory} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-xl shadow-md hover:bg-blue-800 transition">{editingSigId ? 'Save Changes' : 'Create Account'}</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default SignatoriesPage;
