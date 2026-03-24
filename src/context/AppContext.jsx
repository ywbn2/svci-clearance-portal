import React, { useState, useEffect, createContext, useRef } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../supabaseClient';
import { CheckCircleIcon, XCircleIcon } from '../icons';
import { getAccountStatus } from '../utils/helpers';

export const AppContext = createContext();

// ── Internal Modal (kept here to avoid circular import with Navigation.jsx) ──
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>{children}</div>,
    document.body
  );
};

const Modal = ({ isOpen, title, text, confirmText, onConfirm, onCancel, isDanger }) => {
  if (!isOpen) return null;
  return (
    <ModalPortal>
      <div
        className="flex items-center justify-center p-4 animate-fade-in"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', transition: 'opacity 0.2s ease' }}
      >
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.18)] border border-slate-200/50 dark:border-slate-800/50">
          <h2 className={`text-2xl font-black mb-2 ${isDanger ? 'text-rose-600 dark:text-rose-500' : 'text-slate-800 dark:text-white'}`}>{title}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{text}</p>
          <div className="flex gap-4">
            <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
            <button onClick={onConfirm} className={`flex-1 py-3 text-white font-bold rounded-2xl shadow-md transition ${isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#092B9C] hover:bg-blue-800'}`}>{confirmText}</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};


// ── Expiration helpers ──────────────────────────────────────────

export const AppProvider = ({ children }) => {
  const [globalChannel, setGlobalChannel] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [signingEnabled, setSigningEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for debouncing must be at component level, not inside useEffect
  const coursesRefreshTimeout = useRef(null);
  const deptRefreshTimeout = useRef(null);
  const eligibleTableExists = useRef(false); // tracks if eligible_students table is available

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('app_settings').select('signing_enabled, offices, office_categories, year_levels').eq('id', 1).single();
        if (error) {
          console.error('Error fetching app settings:', error);
          return;
        }
        if (data) {
          setSigningEnabled(data.signing_enabled);
          if (data.offices) setOffices(data.offices);
          if (data.office_categories) setOfficeCategories(data.office_categories);
          if (data.year_levels && data.year_levels.length > 0) setYearLevels(data.year_levels);
        }
      } catch (error) {
        console.error('Error in fetchSettings:', error);
      }
    };
    fetchSettings();

    try {
      const settingsChannel = supabase.channel('rt-app-settings')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, ({ new: row }) => {
          if (row.id === 1) {
            if (row.signing_enabled !== undefined) setSigningEnabled(row.signing_enabled);
            if (row.offices) setOffices(row.offices);
            if (row.office_categories) setOfficeCategories(row.office_categories);
            if (row.year_levels && row.year_levels.length > 0) setYearLevels(row.year_levels);
          }
        })
        .subscribe();

      return () => supabase.removeChannel(settingsChannel);
    } catch (error) {
      console.error('Error setting up settings channel:', error);
    }
  }, []);

  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [yearLevels, setYearLevels] = useState(['1st Year', '2nd Year', '3rd Year', '4th Year']); // defaults, overwritten by DB
  const [students, setStudents] = useState([]);

  const [offices, setOffices] = useState([]);
  const [officeCategories, setOfficeCategories] = useState({});

  const [signatories, setSignatories] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]); // Master list of pre-approved students

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('portal_session');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem('portal_session', JSON.stringify(currentUser));
  }, [currentUser]);

  // Sync logged-in student's session when their DB record is updated in real-time
  useEffect(() => {
    if (currentUser?.roleType === 'Student') {
      const updated = students.find(s => s.id === currentUser.id);
      if (updated) {
        // Auto-logout if account becomes deactivated or expired
        const status = getAccountStatus(updated);
        if (status === 'Deactivated' || status === 'Expired') {
          setCurrentUser(null);
          localStorage.removeItem('portal_session');
          showToast(`Your account has been ${status.toLowerCase()}. You have been safely logged out.`, 'error');
          return;
        }

        if (JSON.stringify(updated.office_clearances) !== JSON.stringify(currentUser.office_clearances)) {
          setCurrentUser(prev => ({ ...prev, office_clearances: updated.office_clearances }));
        }
      }
    }
  }, [students]);

  // Auto-logout if the currently logged-in user's account is deleted remotely
  useEffect(() => {
    const accountWatcher = supabase.channel('rt-account-deletion-watch')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'signatories' }, ({ old: row }) => {
        setCurrentUser(prev => {
          if (prev && prev.id === row.id) {
            localStorage.removeItem('portal_session');
            return null;
          }
          return prev;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'students' }, ({ old: row }) => {
        setCurrentUser(prev => {
          if (prev && prev.id === row.id) {
            localStorage.removeItem('portal_session');
            return null;
          }
          return prev;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(accountWatcher);
  }, []);

  useEffect(() => {
    const handleStorageSync = (e) => {
      if (e.key === 'portal_offices' && e.newValue) setOffices(JSON.parse(e.newValue));
      if (e.key === 'portal_office_categories' && e.newValue) setOfficeCategories(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Cache for client info (IP fetch is async, cache after first call)
  const clientInfoCache = useRef(null);

  const getClientInfo = async () => {
    if (clientInfoCache.current) return clientInfoCache.current;
    const ua = navigator.userAgent;
    // Browser
    let browser = 'Unknown';
    if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
    else if (/OPR\//.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua)) browser = 'Google Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';
    // OS
    let os = 'Unknown';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    // Device
    const isMobile = /Mobi|Android|iPhone|iPad/.test(ua);
    const device = isMobile ? 'Mobile' : 'Desktop';
    // IP
    let ip_address = 'Unavailable';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip_address = data.ip;
    } catch (_) {}
    const info = { browser, os, device, ip_address };
    clientInfoCache.current = info;
    return info;
  };

  const logAction = async (user, action, details = '') => {
    if (!user) return;
    const { browser, os, device, ip_address } = await getClientInfo();
    await supabase.from('audit_logs').insert([{
      user_name: user.name || user.id || 'Unknown',
      user_role: user.roleType || 'Unknown',
      user_id: user.id || user.email || '',
      action,
      details,
      ip_address,
      device,
      browser,
      os
    }]);
  };


  const [toast, setToast] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showConfirm = (message, title = "Confirm Action", isDanger = true) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        message, title, isDanger,
        onConfirm: () => { setConfirmDialog(null); resolve(true); },
        onCancel: () => { setConfirmDialog(null); resolve(false); }
      });
    });
  };

  const toastTimeout = useRef(null);
  const exitTimeout = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    if (exitTimeout.current) clearTimeout(exitTimeout.current);
    
    setToast({ message, type });
    setIsExiting(false);
    
    toastTimeout.current = setTimeout(() => {
      setIsExiting(true);
      exitTimeout.current = setTimeout(() => {
        setToast(null);
        setIsExiting(false);
      }, 450); 
    }, 3000);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [
          { data: st, error: stErr }, { data: adminData, error: adminErr }, { data: sigData, error: sigErr },
          { data: cData, error: cErr }, { data: dData, error: dErr }, { data: dcData, error: dcErr }, { data: reqData, error: reqErr }, { data: eligData, error: eligErr }
        ] = await Promise.all([
          supabase.from('students').select('*'),
          supabase.from('admin_users').select('*'),
          supabase.from('signatories').select('*'),
          supabase.from('courses').select('id, name, code'),
          supabase.from('departments').select('*'),
          supabase.from('department_courses').select('*'),
          supabase.from('requirements').select('*'),
          supabase.from('eligible_students').select('*')
        ]);

        // Log errors but don't crash the app
        if (stErr) console.error('Error fetching students:', stErr);
        if (adminErr) console.error('Error fetching admin users:', adminErr);
        if (sigErr) console.error('Error fetching signatories:', sigErr);
        if (cErr) console.error('Error fetching courses:', cErr);
        if (dErr) console.error('Error fetching departments:', dErr);
        if (dcErr) console.error('Error fetching department courses:', dcErr);
        if (reqErr) console.error('Error fetching requirements:', reqErr);
        if (eligErr) console.warn('eligible_students table not found — feature disabled:', eligErr.message);

        if (!isMounted) return;

        // Set data if available
        if (st) setStudents(st);
        if (adminData) setAdminUsers(adminData);
        if (sigData) setSignatories(sigData);
        if (cData) setCourses(cData);
        if (dData && dcData) {
          setDepartments(dData.map(d => ({
            id: d.id, name: d.name, code: d.code,
            assignedCourses: dcData.filter(dc => dc.department_id === d.id).map(dc => dc.course_name)
          })));
        }
        if (reqData) setRequirements(reqData);
        if (eligData) { setEligibleStudents(eligData); eligibleTableExists.current = true; }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
        // App continues with empty data - user can still login
        setIsInitialized(true);
      }
    };
    
    fetchData();

    // ── RESTORE REAL-TIME SUBSCRIPTIONS (Pre-Registered page removed) ──
    
    const studentsChannel = supabase
      .channel('rt-students')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, ({ new: row }) => {
        setStudents(prev => {
          if (prev.find(s => s.id === row.id)) return prev;
          return [...prev, row];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students' }, ({ new: row }) => {
        setStudents(prev => prev.map(s => s.id === row.id ? row : s));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'students' }, ({ old: row }) => {
        setStudents(prev => prev.filter(s => s.id !== row.id));
      })
      .subscribe();

    const reqChannel = supabase
      .channel('rt-requirements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requirements' }, ({ new: row }) => {
        setRequirements(prev => prev.find(r => r.id === row.id) ? prev : [...prev, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requirements' }, ({ new: row }) => {
        setRequirements(prev => prev.map(r => r.id === row.id ? row : r));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'requirements' }, ({ old: row }) => {
        setRequirements(prev => prev.filter(r => r.id !== row.id));
      })
      .subscribe();

    const sigChannel = supabase
      .channel('rt-signatories')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signatories' }, ({ new: row }) => {
        setSignatories(prev => prev.find(s => s.id === row.id) ? prev : [...prev, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signatories' }, ({ new: row }) => {
        setSignatories(prev => prev.map(s => s.id === row.id ? row : s));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'signatories' }, ({ old: row }) => {
        setSignatories(prev => prev.filter(s => s.id !== row.id));
      })
      .subscribe();

    const adminChannel = supabase
      .channel('rt-admin-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_users' }, ({ new: row }) => {
        setAdminUsers(prev => prev.find(a => a.id === row.id) ? prev : [...prev, row]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_users' }, ({ new: row }) => {
        setAdminUsers(prev => prev.map(a => a.id === row.id ? row : a));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'admin_users' }, ({ old: row }) => {
        setAdminUsers(prev => prev.filter(a => a.id !== row.id));
      })
      .subscribe();

    const refreshCoursesWithDebounce = () => {
      if (coursesRefreshTimeout.current) clearTimeout(coursesRefreshTimeout.current);
      coursesRefreshTimeout.current = setTimeout(async () => {
        const { data } = await supabase.from('courses').select('id, name, code');
        if (data) setCourses(data);
      }, 300);
    };

    const refreshDepartmentsWithDebounce = () => {
      if (deptRefreshTimeout.current) clearTimeout(deptRefreshTimeout.current);
      deptRefreshTimeout.current = setTimeout(async () => {
        const [{ data: dData }, { data: dcData }] = await Promise.all([
          supabase.from('departments').select('*'),
          supabase.from('department_courses').select('*')
        ]);
        if (dData && dcData) {
          setDepartments(dData.map(d => ({
            id: d.id, name: d.name, code: d.code,
            assignedCourses: dcData.filter(dc => dc.department_id === d.id).map(dc => dc.course_name)
          })));
        }
      }, 300);
    };

    const coursesChannel = supabase
      .channel('rt-courses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        refreshCoursesWithDebounce();
      })
      .subscribe();

    const deptChannel = supabase
      .channel('rt-departments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
        refreshDepartmentsWithDebounce();
      })
      .subscribe();

    const deptCourseChannel = supabase
      .channel('rt-department-courses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_courses' }, () => {
        refreshDepartmentsWithDebounce();
      })
      .subscribe();

    // Note: Eligible students real-time subscription removed to prevent
    // infinite re-render loops and browser freezing. The admin will rely
    // on manual refresh or page load to see the latest eligible list.

    return () => {
      isMounted = false;
      if (coursesRefreshTimeout.current) clearTimeout(coursesRefreshTimeout.current);
      if (deptRefreshTimeout.current) clearTimeout(deptRefreshTimeout.current);
      if (studentsChannel) supabase.removeChannel(studentsChannel);
      if (reqChannel) supabase.removeChannel(reqChannel);
      if (sigChannel) supabase.removeChannel(sigChannel);
      if (adminChannel) supabase.removeChannel(adminChannel);
      if (coursesChannel) supabase.removeChannel(coursesChannel);
      if (deptChannel) supabase.removeChannel(deptChannel);
      if (deptCourseChannel) supabase.removeChannel(deptCourseChannel);
    };
  }, []);

  // triggerGlobalSync kept for backward compatibility — no longer the primary mechanism
  const triggerGlobalSync = () => {};

  return (
    <AppContext.Provider value={{
      darkMode, setDarkMode, signingEnabled, setSigningEnabled,
      courses, setCourses, departments, setDepartments, yearLevels, setYearLevels, students, setStudents,
      offices, setOffices, officeCategories, setOfficeCategories, signatories, setSignatories, requirements, setRequirements,
      adminUsers, setAdminUsers, eligibleStudents, setEligibleStudents, currentUser, setCurrentUser,
      toast, showToast, triggerGlobalSync, showConfirm, logAction
    }}>
      <div className={`${darkMode ? 'dark' : ''} min-h-screen transition-colors duration-300 relative bg-white dark:bg-slate-950`}>
        {!isInitialized ? (
          <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : (
          children
        )}
        {confirmDialog && (
          <Modal 
             isOpen={true} 
             title={confirmDialog.title} 
             text={confirmDialog.message} 
             confirmText="Yes, Proceed" 
             onConfirm={confirmDialog.onConfirm} 
             onCancel={confirmDialog.onCancel} 
             isDanger={confirmDialog.isDanger}
          />
        )}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 ${isExiting ? 'animate-toast-out' : 'animate-toast'} ${toast.type === 'success' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-100' : 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/90 dark:border-rose-700 dark:text-rose-100'}`}>
            {toast.type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
};

// --- REUSABLE COMPONENTS ---
