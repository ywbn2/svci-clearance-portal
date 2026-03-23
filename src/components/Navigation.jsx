import React, { useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { Routes, Route, Navigate, useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { DashboardIcon, StudentsIcon, PenIcon, ShieldIcon, BookIcon, BuildingIcon, FileCheckIcon, FileTextIcon, SunIcon, MoonIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, UserIcon } from '../icons';
import { AppContext } from '../context/AppContext';
import logoImg from '../assets/logo.png';


export const Card = ({ children, className = "" }) => (
  <div className={`bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-100 dark:border-slate-800/50 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}>
    {children}
  </div>
);

// ModalPortal: Renders any modal content directly into document.body,
// bypassing parent CSS transforms/filters that trap position:fixed elements.

export const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      {children}
    </div>,
    document.body
  );
};

export const Modal = ({ isOpen, title, text, confirmText, onConfirm, onCancel, isDanger }) => {
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

// --- PAGE COMPONENTS ---

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode, currentUser, setCurrentUser } = useContext(AppContext);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const navLinks = currentUser?.roleType === 'Student' ? [
    { path: '/', icon: <DashboardIcon />, label: 'Dashboard' },
    { path: '/profile', icon: <UserIcon />, label: 'Profile' },
  ] : currentUser?.roleType === 'Signatory' ? [
    { path: '/', icon: <DashboardIcon />, label: 'Dashboard' },
    { path: '/students', icon: <StudentsIcon />, label: 'Students' },
    { path: '/requirements', icon: <FileCheckIcon />, label: 'Requirements' },
    { path: '/logs', icon: <FileTextIcon />, label: 'Audit Logs' },
  ] : [
    { path: '/', icon: <DashboardIcon />, label: 'Dashboard' },
    { path: '/students', icon: <StudentsIcon />, label: 'Students' },
    { path: '/signatories', icon: <PenIcon />, label: 'Signatories' },
    { path: '/admin', icon: <ShieldIcon />, label: 'Admin Users' },
    { path: '/courses', icon: <BookIcon />, label: 'Courses' },
    { path: '/departments', icon: <BuildingIcon />, label: 'Departments' },
    { path: '/year-levels', icon: <CalendarIcon />, label: 'Year Levels' },
    { path: '/requirements', icon: <FileCheckIcon />, label: 'Requirements' },
    { path: '/logs', icon: <FileTextIcon />, label: 'Audit Logs' },
    { path: '/eligible-students', icon: <ShieldIcon />, label: 'Pre-Registered' },
  ];

  const sidebarContent = (
    <div className="w-64 bg-[#092B9C] dark:bg-slate-950 border-r dark:border-slate-800 text-white flex flex-col h-full transition-colors duration-300">
      <div className="p-6 text-center border-b border-white/10 dark:border-slate-800 flex flex-col items-center relative gap-2 shrink-0">
        <button onClick={onClose} className="md:hidden text-white/70 hover:text-white p-1 absolute top-3 right-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <img src={logoImg} alt="College Logo" className="w-16 h-16 object-contain drop-shadow-lg" />
        <div>
          <h1 className="text-xl font-black tracking-wider text-white">Clearance Portal</h1>
          <p className="text-[9px] font-bold text-blue-200 mt-0.5 opacity-90 uppercase tracking-widest leading-relaxed">Saint Vincent's College Incorporated</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => (
          <Link key={link.path} to={link.path} onClick={onClose} className={`w-full text-left p-3 rounded-lg font-bold transition flex items-center gap-3 ${location.pathname === link.path ? 'bg-white text-[#092B9C] dark:bg-blue-600 dark:text-white shadow-md' : 'hover:bg-white/10 text-white/90'}`}>
            <span>{link.icon}</span> {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 dark:border-slate-800 space-y-3 bg-[#07227d] dark:bg-slate-900/50">
        <button onClick={() => setDarkMode(!darkMode)} className="w-full p-3 rounded-lg bg-black/20 hover:bg-black/40 dark:bg-white/10 dark:hover:bg-white/20 transition flex items-center justify-center gap-2 font-bold text-sm">
          {darkMode ? <><SunIcon className="w-4 h-4"/> Light Mode</> : <><MoonIcon className="w-4 h-4"/> Dark Mode</>}
        </button>
        <div className="text-sm text-blue-200 text-center">
          {currentUser?.roleType === 'Student'
            ? 'Student Portal'
            : currentUser?.roleType === 'Signatory'
              ? <span className="leading-tight">
                  <span className="font-black text-white">{currentUser?.role || 'Signatory'}</span>
                  {currentUser?.office && currentUser?.office !== currentUser?.role && (
                    <span className="block text-blue-300 text-xs">{currentUser.office}{currentUser.dept_code ? ` — ${currentUser.dept_code}` : ''}</span>
                  )}
                  {currentUser?.dept_code && currentUser?.office === currentUser?.role && (
                    <span className="block text-blue-300 text-xs">{currentUser.dept_code} Dept.</span>
                  )}
                </span>
              : 'Admin Portal'}
          <br />
          <span className="text-white font-bold tracking-wide text-xs break-all">{currentUser?.name || currentUser?.email || 'User'}</span>
        </div>
        <button onClick={handleLogout} className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/30 text-rose-200 hover:text-white font-bold text-sm transition flex items-center justify-center gap-2 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" /></svg>
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: always visible sticky sidebar */}
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile: slide-in drawer with backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-[9998] md:hidden flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          {/* Drawer */}
          <div className="relative z-10 h-full flex-shrink-0 flex">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export const Topbar = ({ onMenuToggle }) => {
  const location = useLocation();
  const { currentUser } = useContext(AppContext);
  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/students': return 'Student Management';
      case '/signatories': return 'Signatories & Offices';
      case '/courses': return 'Courses Configuration';
      case '/departments': return 'Department Configuration';
      default: return 'System Administration';
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 flex justify-between items-center sticky top-0 z-10 transition-colors">
      <div className="flex items-center gap-3">
        {/* Hamburger — only on mobile */}
        <button onClick={onMenuToggle} className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">{getTitle()}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-3">
          <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser?.name}</span>
          {currentUser?.roleType && (
            <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-1 rounded-md shadow-sm ${
              currentUser.roleType === 'Admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50' :
              currentUser.roleType === 'Signatory' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50' :
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
            }`}>
              {currentUser.roleType}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export const ProtectedAdminLayout = ({ children }) => {
  const { currentUser, darkMode } = useContext(AppContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!currentUser) return <Navigate to="/login" replace />;
  return (
    <div className={`flex bg-slate-50/50 dark:bg-[#0a0f1c] min-h-screen text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export const StudentPortalLayout = () => {
  const { darkMode } = useContext(AppContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className={`flex bg-slate-50/50 dark:bg-[#0a0f1c] min-h-screen text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const GenericPlaceholder = ({ title, desc }) => (
  <Card className="flex flex-col items-center justify-center h-96 border-dashed">
    <h2 className="text-2xl font-black text-slate-400 dark:text-slate-500 mb-2">{title}</h2>
    <p className="text-slate-500 dark:text-slate-400">{desc}</p>
    <button className="mt-6 px-4 py-2 bg-[#092B9C] text-white rounded-lg font-bold">+ Add New Entry</button>
  </Card>
);

// --- LAYOUT COMPONENTS ---

