import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { Modal, ModalPortal } from '../../components/Navigation';

const RequirementsPage = () => {
  const { currentUser, requirements, setRequirements, showToast, showConfirm, logAction, offices, triggerGlobalSync } = useContext(AppContext);
  const isAdmin = currentUser?.roleType !== 'Signatory' && currentUser?.roleType !== 'Student';

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', mandatory: true, office: '' });
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState('All');

  const officeReqs = requirements.filter(r => 
    isAdmin ? (selectedOfficeFilter === 'All' ? true : r.office === selectedOfficeFilter) : r.office === currentUser?.office
  );

  const handleOpenModal = (req = null) => {
    if (req) {
      setEditingId(req.id);
      setFormData({ title: req.title, description: req.description, mandatory: req.mandatory, office: req.office || '' });
    } else {
      setEditingId(null);
      setFormData({ title: '', description: '', mandatory: true, office: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (isAdmin && !formData.office?.trim()) return showToast("Office is required for Admin assignment.", "error");
    if (!formData.description?.trim()) return showToast("Description is required.", "error");
    const autoTitle = formData.description.trim().substring(0, 60) || 'Requirement';
    
    const assignedOffice = isAdmin ? formData.office : currentUser?.office;

    if (editingId) {
      const payload = {
        title: autoTitle, description: formData.description, mandatory: formData.mandatory, office: isAdmin ? formData.office : requirements.find(r=>r.id===editingId)?.office
      };
      const { error } = await supabase.from('requirements').update(payload).eq('id', editingId);
      if (error) return showToast("DB Error: " + error.message, "error");

      setRequirements(requirements.map(r => r.id === editingId ? { ...r, ...payload } : r));
      triggerGlobalSync();
      showToast("Requirement updated globally!");
      logAction(currentUser, 'Edited Requirement', `Updated: "${formData.title}" in ${payload.office || assignedOffice} office`);
    } else {
      const newReq = {
        author: currentUser?.email || (isAdmin ? "super-admin" : "unknown"),
        office: assignedOffice,
        title: autoTitle,
        description: formData.description,
        mandatory: formData.mandatory,
        dept_code: currentUser?.dept_code || null
      };
      
      const { data, error } = await supabase.from('requirements').insert([newReq]).select();
      if (error) return showToast("DB Error: " + error.message, "error");

      if (data) setRequirements([...requirements, ...data]);
      triggerGlobalSync();
      showToast("New requirement globally published!");
      logAction(currentUser, 'Added Requirement', `Published: "${formData.title}" for ${assignedOffice} office`);
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    const req = requirements.find(r => r.id === id);
    // Non-admins can only delete their own requirements
    if (!isAdmin && req?.author !== currentUser?.email) {
      return showToast("You can only delete requirements you posted.", "error");
    }
    if (await showConfirm("Are you sure you want to completely destroy this requirement globally?")) {
      const { error } = await supabase.from('requirements').delete().eq('id', id);
      if (error) return showToast("Failed: " + error.message, "error");

      setRequirements(requirements.filter(r => r.id !== id));
      triggerGlobalSync();
      showToast("Requirement removed from master database.", "error");
      logAction(currentUser, 'Deleted Requirement', `Removed a requirement from the system`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 p-4 border border-[#092B9C]/20 bg-[#092B9C]/5 dark:bg-blue-900/10 rounded-xl">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
            {isAdmin ? (selectedOfficeFilter === 'All' ? 'Global Requirements' : `${selectedOfficeFilter} Requirements`) : `${currentUser?.office} Requirements`}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">Design clearance tasks that automatically block student records from clearing.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
              {/* Admin sees all distinct offices from requirements, not just the global list */}
            {isAdmin && (
            <select value={selectedOfficeFilter} onChange={(e) => setSelectedOfficeFilter(e.target.value)} className="p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] shadow-sm cursor-pointer">
              <option value="All">All Offices</option>
              {[...new Set(requirements.map(r => r.office).filter(Boolean))].sort().map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <button onClick={() => handleOpenModal()} className="bg-[#092B9C] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition shadow-lg whitespace-nowrap">+ Add Requirement</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {officeReqs.map(r => (
          <Card key={r.id} className="border-l-4 border-[#092B9C] flex flex-col justify-between shadow-md">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-xl text-slate-800 dark:text-white">
                  {isAdmin && <span className="text-[#092B9C] dark:text-blue-500 text-xs block mb-1 uppercase tracking-widest">{r.office} {r.author && `• Posted by ${r.author}`}</span>}
                  {r.title}
                </h3>
                {r.mandatory && <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-xs font-black uppercase px-3 py-1 rounded shadow-sm">Mandatory</span>}
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium leading-relaxed">{r.description}</p>
            </div>
            <div className="flex gap-4 pt-4 border-t dark:border-slate-700/50">
              <button onClick={() => handleOpenModal(r)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 transition border dark:border-slate-700">Edit Info</button>
              <button onClick={() => handleDelete(r.id)} className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg font-bold hover:bg-rose-100 transition border border-rose-200 dark:border-rose-900/50">Delete Task</button>
            </div>
          </Card>
        ))}
        {officeReqs.length === 0 && (
          <div className="md:col-span-2 p-12 text-center text-slate-500 italic bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-dashed dark:border-slate-700 font-bold">
            No specific requirements setup yet. Students naturally only need standard clearance right now.
          </div>
        )}
      </div>

      {showModal && (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 transform transition-opacity duration-200 ease-in-out">
            <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-white">{editingId ? 'Edit Configuration' : 'Define New Requirement'}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Dictate explicit instructions for students completing their clearance under {currentUser?.office}.</p>
            
            <div className="space-y-5 mb-8">
              {isAdmin && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Assign to Office <span className="text-rose-500">*</span></label>
                  <select value={formData.office} onChange={e=>setFormData({...formData, office: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]">
                    <option value="" disabled>Select Office</option>
                    {offices.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Elaborate Description</label>
                <textarea placeholder="Detailed instructions for the student..." value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] min-h-[120px]"></textarea>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition shadow-sm">
                <input type="checkbox" checked={formData.mandatory} onChange={e=>setFormData({...formData, mandatory: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-[#092B9C] focus:ring-[#092B9C] bg-white cursor-pointer" />
                <span className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Strict Mandatory Blocker</span>
              </label>
            </div>

            <div className="flex gap-4 mt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel Setup</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-2xl shadow-md hover:bg-blue-800 transition">Save Condition</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default RequirementsPage;
