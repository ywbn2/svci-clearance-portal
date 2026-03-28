import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { Modal, ModalPortal } from '../../components/Navigation';

const AdminPage = () => {
  const { adminUsers, setAdminUsers, showToast, showConfirm, logAction, currentUser, setCurrentUser } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Admin' });
  const [showPassword, setShowPassword] = useState(false);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({ name: user.name, email: user.email, password: user.password || '', role: user.role });
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', password: '', role: 'Admin' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (formData.name && formData.email && formData.password && formData.role) {
      // Prevent a regular Admin from promoting themselves to Super Admin
      if (editingId === currentUser?.id && currentUser?.role !== 'Super Admin' && formData.role === 'Super Admin') {
        return showToast("Only a Super Admin can grant Super Admin privileges.", "error");
      }
      setShowModal(false);
      const rollback = [...adminUsers];

      if (editingId) {
        setAdminUsers(adminUsers.map(u => u.id === editingId ? { ...u, ...formData } : u));
        if (editingId === currentUser?.id) {
          setCurrentUser(prev => ({ ...prev, ...formData }));
        }
        const { error } = await supabase.from('admin_users').update(formData).eq('id', editingId);
        if (error) { setAdminUsers(rollback); return showToast(`Failed: ${error.message}`, "error"); }
        showToast("Admin access settings updated.");
      } else {
        const newId = `ADM-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
        const newAdmin = { id: newId, ...formData };
        setAdminUsers([...adminUsers, newAdmin]);
        const { error } = await supabase.from('admin_users').insert([newAdmin]);
        if (error) { setAdminUsers(rollback); return showToast(`Failed: ${error.message}`, "error"); }
        showToast("New Administrator created successfully!");
      }
    }
  };

  const handleDelete = async (id) => {
    if (await showConfirm("Are you sure you want to delete this admin account?")) {
      const rollback = [...adminUsers];
      setAdminUsers(adminUsers.filter(u => u.id !== id));
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) {
        setAdminUsers(rollback);
        showToast(`Failed: ${error.message}`, "error");
      } else {
        showToast("Administrator deleted.", "error");
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Admin Accounts</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage super-users and system access levels</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-[#092B9C] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition shadow-md">
          + Add Admin
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto border dark:border-slate-700 rounded-lg">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-900/80 border-b dark:border-slate-700 text-slate-800 dark:text-slate-200">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              {adminUsers.map((user, idx) => {
                // Protect the first Super Admin from deletion
                const isPrimary = idx === 0 && user.role === 'Super Admin';
                
                return (
                  <tr key={idx} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{user.name}</td>
                    <td className="p-4 text-slate-500">{user.email}</td>
                    <td className="p-4">
                      <span className={`py-1 px-2 rounded-md text-xs font-bold ${user.role === 'Super Admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-3">
                      <button onClick={() => handleOpenModal(user)} className="text-[#092B9C] dark:text-blue-400 font-bold hover:underline">Edit</button>
                      {!isPrimary ? (
                        <button onClick={() => handleDelete(user.id)} className="text-rose-500 font-bold hover:underline">Delete</button>
                      ) : (
                        <span className="text-slate-400 text-xs font-bold cursor-not-allowed uppercase" title="Primary account cannot be deleted">Protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {adminUsers.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-slate-500">No admins registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease', overflowY: 'auto' }} className="flex items-start sm:items-center justify-center p-4 py-6 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-800/50 transform transition-opacity duration-200 ease-in-out">
            <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-white">{editingId ? 'Edit Admin' : 'Add Admin'}</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{editingId ? 'Modify existing admin permissions.' : 'Create a new admin account.'}</p>
            
            <div className="space-y-4 mb-6">
              <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
              <input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C]" />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] pr-16" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 uppercase">
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Account Role</label>
                <select 
                  value={formData.role} 
                  disabled={adminUsers[0]?.id === editingId && adminUsers[0]?.role === 'Super Admin'}
                  onChange={e => setFormData({ ...formData, role: e.target.value })} 
                  className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#092B9C] ${(adminUsers[0]?.id === editingId && adminUsers[0]?.role === 'Super Admin') ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
                {adminUsers[0]?.id === editingId && adminUsers[0]?.role === 'Super Admin' && (
                  <p className="text-[10px] text-amber-600 font-bold ml-1 uppercase letter-spacing-wider">Primary Superadmin role is protected</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-[#092B9C] text-white font-bold rounded-xl shadow-md hover:bg-blue-800 transition">{editingId ? 'Save Changes' : 'Create Admin'}</button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AdminPage;
