import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { supabase } from '../../supabaseClient';
import { UsersIcon, UploadIcon, Trash2Icon, PlusIcon, SearchIcon, ShieldIcon, CheckCircleIcon, EditIcon, SaveIcon, XIcon } from '../../icons';
import * as XLSX from 'xlsx';
import { Modal, ModalPortal } from '../../components/Navigation';

const EligibleStudentsPage = () => {
  const { eligibleStudents, setEligibleStudents, showToast, showConfirm, logAction } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState({ school_id: '', firstname: '', lastname: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
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
        let errors = 0;

        parsedData.forEach(row => {
          // Try to aggressively match column names like "School ID", "ID", "First Name", "Firstname", etc.
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
            } else {
              errors++;
            }
          } else {
            errors++;
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

        logAction('Admin', 'Uploaded Eligible Students', `Imported ${validRows.length} students via Excel.`);
        showToast(`Successfully imported ${validRows.length} eligible students!`);
      } catch (error) {
        console.error("Upload error:", error);
        showToast("Error processing file: " + error.message, "error");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveStudent = async () => {
    const { school_id, firstname, lastname } = formState;
    if (!school_id.trim() || !firstname.trim() || !lastname.trim()) {
      return showToast("All fields are required.", "error");
    }

    try {
      if (editingId && editingId !== school_id) {
        // If changing ID, delete old one
        await supabase.from('eligible_students').delete().eq('school_id', editingId);
      }

      const { error } = await supabase.from('eligible_students').upsert({
        school_id: school_id.trim(),
        firstname: firstname.trim(),
        lastname: lastname.trim()
      });

      if (error) throw error;

      showToast(`Student ${editingId ? 'updated' : 'added'} successfully.`);
      setShowAddModal(false);
    } catch (err) {
      showToast("Failed to save student: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    showConfirm("Remove Student", `Are you sure you want to remove ${id} from the eligible list?`, async () => {
      const { error } = await supabase.from('eligible_students').delete().eq('school_id', id);
      if (error) showToast("Error removing student.", "error");
      else showToast("Student removed from eligible list.");
    });
  };

  const handleDeleteAll = async () => {
    showConfirm("Clear Entire List", "WARNING: This will remove ALL eligible students. Existing registered students will not be affected, but no new students will be able to sign up until you upload a new list. Are you sure?", async () => {
      // Supabase trick to delete all rows: filter by id is not null
      const { error } = await supabase.from('eligible_students').delete().neq('school_id', '0');
      if (error) {
        showToast("Failed to clear list.", "error");
      } else {
        logAction('Admin', 'Cleared Eligible List', 'Admin deleted all students from the eligible registry.');
        showToast("Eligible students list cleared successfully.");
      }
    });
  };

  const handleOpenAdd = () => {
    setFormState({ school_id: '', firstname: '', lastname: '' });
    setEditingId(null);
    setShowAddModal(true);
  };

  const handleEdit = (student) => {
    setFormState({ school_id: student.school_id, firstname: student.firstname, lastname: student.lastname });
    setEditingId(student.school_id);
    setShowAddModal(true);
  };

  const filtered = eligibleStudents.filter(s => 
    s.school_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.firstname.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.lastname.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            onClick={() => fileInputRef.current.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <UploadIcon className="w-4 h-4" /> {isProcessing ? 'Uploading...' : 'Import Excel'}
          </button>
          <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <PlusIcon className="w-4 h-4" /> Add Manual
          </button>
          {eligibleStudents.length > 0 && (
            <button onClick={handleDeleteAll} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Trash2Icon className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex-1 flex flex-col min-h-0 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="relative w-full sm:w-64">
            <SearchIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search ID or Name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} eligible student{filtered.length !== 1 && 's'} listed
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="min-w-full text-left bg-white dark:bg-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">School ID</th>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">First Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Last Name</th>
                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No eligible students found in the registry.</p>
                    <p className="text-sm mt-1 opacity-70">Upload an Excel file to authorize signups.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(student => (
                  <tr key={student.school_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-3 font-medium">{student.school_id}</td>
                    <td className="px-6 py-3">{student.firstname}</td>
                    <td className="px-6 py-3">{student.lastname}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleEdit(student)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors mr-2">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(student.school_id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalPortal>
        {showAddModal && (
          <Modal title={editingId ? "Edit Eligible Student" : "Add Eligible Student"} onClose={() => setShowAddModal(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">School ID</label>
                <input 
                  type="text" 
                  value={formState.school_id} 
                  onChange={e => setFormState({...formState, school_id: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. 2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input 
                  type="text" 
                  value={formState.firstname} 
                  onChange={e => setFormState({...formState, firstname: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 focus:outline-none focus:border-indigo-500"
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input 
                  type="text" 
                  value={formState.lastname} 
                  onChange={e => setFormState({...formState, lastname: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 focus:outline-none focus:border-indigo-500"
                  placeholder="Dela Cruz"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium">Cancel</button>
                <button onClick={handleSaveStudent} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                  {editingId ? "Save Changes" : "Add Student"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </ModalPortal>
    </div>
  );
};

export default EligibleStudentsPage;
