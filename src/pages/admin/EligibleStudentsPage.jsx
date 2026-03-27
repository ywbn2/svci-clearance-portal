import React, { useState, useContext, useRef, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { supabase } from '../../supabaseClient';
import { UsersIcon, UploadIcon, Trash2Icon, PlusIcon, SearchIcon, ShieldIcon, CheckCircleIcon, EditIcon, SaveIcon, XIcon } from '../../icons';
import * as XLSX from 'xlsx';
import { ModalPortal } from '../../components/Navigation';

const EligibleStudentsPage = () => {
  // Only pull what is absolutely needed for rendering to avoid context update loops
  const { eligibleStudents, setEligibleStudents, students, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'registered' | 'not-registered'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const fileInputRef = useRef(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState({ school_id: '', firstname: '', lastname: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Safe memoization with extensive null/undefined checks
  const filtered = useMemo(() => {
    const list = Array.isArray(eligibleStudents) ? eligibleStudents : [];
    const registeredIds = new Set(Array.isArray(students) ? students.map(s => s.id) : []);

    // Always sort by family name A-Z
    const sorted = [...list].sort((a, b) => (a.lastname || '').localeCompare(b.lastname || ''));

    const search = searchTerm.toLowerCase().trim();

    return sorted.filter(s => {
      if (!s || typeof s !== 'object') return false;

      // Status filter
      if (statusFilter === 'registered' && !registeredIds.has(s.school_id)) return false;
      if (statusFilter === 'not-registered' && registeredIds.has(s.school_id)) return false;

      // Search filter
      if (search) {
        const idStr = String(s.school_id || '').toLowerCase();
        const firstStr = String(s.firstname || '').toLowerCase();
        const lastStr = String(s.lastname || '').toLowerCase();
        if (!idStr.includes(search) && !firstStr.includes(search) && !lastStr.includes(search)) return false;
      }

      return true;
    });
  }, [eligibleStudents, students, searchTerm, statusFilter]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const paginatedList = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };


  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet);

        let validRows = [];

        parsedData.forEach(row => {
          if (!row || typeof row !== 'object') return;
          
          const keys = Object.keys(row);
          const getIdKey = keys.find(k => k.toLowerCase().includes('id'));
          const getFirstKey = keys.find(k => k.toLowerCase().includes('first'));
          const getLastKey = keys.find(k => k.toLowerCase().includes('last'));

          if (getIdKey && getFirstKey && getLastKey) {
            const id = String(row[getIdKey]).trim();
            const first = String(row[getFirstKey]).trim();
            const last = String(row[getLastKey]).trim();

            if (id && first && last) {
              validRows.push({ school_id: id, firstname: first, lastname: last });
            }
          }
        });

        if (validRows.length === 0) {
          showToast("No valid rows found. Please ensure columns include 'ID', 'First Name', and 'Last Name'", "error");
          setIsProcessing(false);
          return;
        }

        // Send to Supabase
        const { error } = await supabase.from('eligible_students').upsert(validRows, { onConflict: 'school_id' });
        if (error) throw error;

        // Optimistically update the local state to avoid needing a real-time fetch loop
        if (typeof setEligibleStudents === 'function') {
           setEligibleStudents(prev => {
             const prevArray = Array.isArray(prev) ? prev : [];
             const newArray = [...prevArray];
             // Simple distinct merge
             validRows.forEach(vr => {
               const idx = newArray.findIndex(e => e.school_id === vr.school_id);
               if (idx > -1) newArray[idx] = vr;
               else newArray.push(vr);
             });
             return newArray;
           });
        }

        if (typeof logAction === 'function' && currentUser) {
          logAction(currentUser, 'Uploaded Eligible Students', `Imported ${validRows.length} students via Excel.`);
        }
        
        showToast(`Successfully imported ${validRows.length} eligible students!`);
      } catch (error) {
        console.error("Upload error:", error);
        showToast("Error processing file: " + (error?.message || 'Unknown error'), "error");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveStudent = async () => {
    const { school_id, firstname, lastname } = formState;
    if (!school_id.trim() || !firstname.trim() || !lastname.trim()) {
      showToast("All fields are required.", "error");
      return;
    }

    try {
      if (editingId && editingId !== school_id) {
        await supabase.from('eligible_students').delete().eq('school_id', editingId);
        if (typeof setEligibleStudents === 'function') {
           setEligibleStudents(prev => Array.isArray(prev) ? prev.filter(e => e.school_id !== editingId) : []);
        }
      }

      const newStudent = {
        school_id: school_id.trim(),
        firstname: firstname.trim(),
        lastname: lastname.trim()
      };

      const { error } = await supabase.from('eligible_students').upsert(newStudent);
      if (error) throw error;

      // Optimistic update
      if (typeof setEligibleStudents === 'function') {
         setEligibleStudents(prev => {
           const arr = Array.isArray(prev) ? prev : [];
           const exists = arr.findIndex(e => e.school_id === newStudent.school_id);
           if (exists > -1) {
             const copy = [...arr];
             copy[exists] = newStudent;
             return copy;
           }
           return [...arr, newStudent];
         });
      }

      showToast(`Student ${editingId ? 'updated' : 'added'} successfully.`);
      setShowAddModal(false);
    } catch (err) {
      showToast("Failed to save student: " + (err?.message || 'Unknown error'), "error");
    }
  };

  const handleDelete = async (id) => {
    if (!id || typeof showConfirm !== 'function') return;
    
    const confirmed = await showConfirm(`Are you sure you want to remove ${id} from the eligible list?`, "Remove Student", false);
    if (confirmed) {
      try {
        const { error } = await supabase.from('eligible_students').delete().eq('school_id', id);
        if (error) {
          showToast("Error removing student.", "error");
          return;
        }

        // Optimistic update
        if (typeof setEligibleStudents === 'function') {
           setEligibleStudents(prev => Array.isArray(prev) ? prev.filter(e => e.school_id !== id) : []);
        }
        showToast("Student removed from eligible list.");
      } catch (err) {
        console.error("Delete error:", err);
        showToast("Error removing student: " + (err?.message || 'Unknown error'), "error");
      }
    }
  };

  const handleDeleteAll = async () => {
    if (typeof showConfirm !== 'function') return;
    
    const confirmed = await showConfirm("WARNING: This will remove ALL eligible students. Existing registered students will not be affected, but no new students will be able to sign up until you upload a new list. Are you sure?", "Clear Entire List", true);
    if (confirmed) {
      try {
        const { error } = await supabase.from('eligible_students').delete().neq('school_id', '0');
        if (error) {
          showToast("Failed to clear list.", "error");
        } else {
          if (typeof setEligibleStudents === 'function') setEligibleStudents([]);
          if (typeof logAction === 'function' && currentUser) {
            logAction(currentUser, 'Cleared Eligible List', 'Admin deleted all students from the registry.');
          }
          showToast("Eligible students list cleared successfully.");
        }
      } catch (err) {
        console.error("Delete all error:", err);
        showToast("Error clearing list: " + (err?.message || 'Unknown error'), "error");
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (typeof showConfirm !== 'function') return;
    
    const confirmed = await showConfirm(`Are you sure you want to remove ${selectedIds.size} selected student(s) from the registry?`, "Remove Selected", false);
    if (confirmed) {
      try {
        const idsToDelete = Array.from(selectedIds);
        let hasError = false;
        for (let i = 0; i < idsToDelete.length; i += 100) {
          const chunk = idsToDelete.slice(i, i + 100);
          const { error } = await supabase.from('eligible_students').delete().in('school_id', chunk);
          if (error) hasError = true;
        }

        if (hasError) {
          showToast("Completed with some errors.", "error");
        } else {
          showToast(`Successfully removed ${idsToDelete.length} student(s).`);
          if (typeof logAction === 'function' && currentUser) {
            logAction(currentUser, 'Bulk Deleted Eligible Students', `Admin removed ${idsToDelete.length} students from the registry.`);
          }
        }
        if (typeof setEligibleStudents === 'function') {
           setEligibleStudents(prev => Array.isArray(prev) ? prev.filter(e => !selectedIds.has(e.school_id)) : []);
        }
        setSelectedIds(new Set());
      } catch (err) {
        showToast("Error removing students: " + (err?.message || 'Unknown error'), "error");
      }
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const pageIds = paginatedList.map(s => s.school_id).filter(Boolean);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleOpenAdd = () => {
    setFormState({ school_id: '', firstname: '', lastname: '' });
    setEditingId(null);
    setShowAddModal(true);
  };

  const handleEdit = (student) => {
    if (!student) return;
    setFormState({ 
      school_id: student.school_id || '', 
      firstname: student.firstname || '', 
      lastname: student.lastname || '' 
    });
    setEditingId(student.school_id || null);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldIcon className="w-6 h-6 text-indigo-500" /> Authorized Signups</h2>
          <p className="text-gray-500 text-sm mt-1">Manage the master list of students allowed to register in the system.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => { if(fileInputRef.current) fileInputRef.current.click() }}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <UploadIcon className="w-4 h-4" /> {isProcessing ? 'Uploading...' : 'Import Excel'}
          </button>
          <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <PlusIcon className="w-4 h-4" /> Add Manual
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold shadow-sm">
              <Trash2Icon className="w-4 h-4" /> Delete Selected ({selectedIds.size})
            </button>
          )}
          {Array.isArray(eligibleStudents) && eligibleStudents.length > 0 && (
            <button onClick={handleDeleteAll} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Trash2Icon className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border-l-4 border-indigo-500 p-6 rounded-xl shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 font-bold mb-1 text-sm uppercase tracking-wider">Total Authorized</h3>
          <p className="text-3xl font-black text-slate-800 dark:text-white">
            {Array.isArray(eligibleStudents) ? eligibleStudents.length.toLocaleString() : 0}
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-2 flex items-center gap-1">
            <CheckCircleIcon className="w-3 h-3" /> Students ready for signup
          </p>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 p-6 rounded-xl shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 font-bold mb-1 text-sm uppercase tracking-wider">Matched Search</h3>
          <p className="text-3xl font-black text-slate-800 dark:text-white">{totalFiltered.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">Current filter results</p>
        </div>
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500 p-6 rounded-xl shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 font-bold mb-1 text-sm uppercase tracking-wider">Registry Sync</h3>
          <p className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            {Array.isArray(eligibleStudents) && Array.isArray(students) 
              ? eligibleStudents.filter(e => students.some(s => s.id === e.school_id)).length.toLocaleString() 
              : 0}
            <span className="text-sm font-bold text-slate-400">/ {Array.isArray(eligibleStudents) ? eligibleStudents.length.toLocaleString() : 0}</span>
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-2 flex items-center gap-1">
             <CheckCircleIcon className="w-3 h-3" /> Signed up students
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search ID or Name..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg border dark:bg-gray-700 dark:bg-slate-800 dark:border-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            {/* Status filter tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'registered', label: '✓ Registered' },
                { key: 'not-registered', label: 'Not Registered' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    statusFilter === key
                      ? key === 'registered'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : key === 'not-registered'
                        ? 'bg-slate-500 text-white shadow-sm'
                        : 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing Page {currentPage} of {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="min-w-full text-left bg-white dark:bg-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
              <tr>
                <th className="px-6 py-4 w-12 text-center text-gray-600 dark:text-gray-300">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={paginatedList.length > 0 && paginatedList.every(s => selectedIds.has(s.school_id))}
                    onChange={toggleAllOnPage}
                    title="Select all on this page"
                  />
                </th>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">School ID</th>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">First Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Last Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No eligible students found in this view.</p>
                    <p className="text-sm mt-1 opacity-70">Upload an Excel file to authorize signups.</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((student, idx) => {
                  const isRegistered = Array.isArray(students) && students.some(s => s.id === student.school_id);
                  
                  // Use combination of id and idx for absolute fallback 
                  return (
                    <tr key={`${student.school_id}-${idx}`} className={`transition-colors ${selectedIds.has(student.school_id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : isRegistered ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                      <td className="px-6 py-3 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedIds.has(student.school_id)}
                          onChange={() => toggleSelection(student.school_id)}
                        />
                      </td>
                      <td className="px-6 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          {student.school_id || '-'}
                          {isRegistered && (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircleIcon className="w-3 h-3" /> Registered
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">{student.firstname || '-'}</td>
                      <td className="px-6 py-3">{student.lastname || '-'}</td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => handleEdit(student)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mr-2">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(student.school_id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2Icon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFiltered)} of {totalFiltered} entries
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[9999]"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">
                {editingId ? "Edit Eligible Student" : "Add Eligible Student"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">School ID</label>
                  <input 
                    type="text" 
                    value={formState.school_id} 
                    onChange={e => setFormState({...formState, school_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input 
                    type="text" 
                    value={formState.firstname} 
                    onChange={e => setFormState({...formState, firstname: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={formState.lastname} 
                    onChange={e => setFormState({...formState, lastname: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-indigo-500"
                    placeholder="Dela Cruz"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium">Cancel</button>
                  <button onClick={handleSaveStudent} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                    {editingId ? "Save Changes" : "Add Student"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default EligibleStudentsPage;
