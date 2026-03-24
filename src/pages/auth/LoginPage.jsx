import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { YEAR_DAYS, computeExpirationDate, getAccountStatus, getRemainingDays } from '../../utils/helpers';

const LoginPage = () => {
  const { adminUsers, signatories, students, setCurrentUser, currentUser, darkMode } = useContext(AppContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill all fields");

    const admin = adminUsers.find(u => u.email === email && u.password === password);
    if (admin) { setCurrentUser({ ...admin, roleType: 'Admin' }); return navigate('/'); }

    const sig = signatories.find(u => u.email === email && u.password === password);
    if (sig) { setCurrentUser({ ...sig, roleType: 'Signatory' }); return navigate('/'); }

    const student = students.find(u => u.id === email && u.password === password);
    if (student) {
      const acctStatus = getAccountStatus(student);
      if (acctStatus === 'Deactivated') return setError('Your account has been deactivated. Please contact the administrator.');
      if (acctStatus === 'Expired') return setError('Your account has expired. Please contact the administrator.');
      setCurrentUser({ ...student, roleType: 'Student' });
      return navigate('/');
    }

    setError("Invalid ID or password. Please check your credentials and try again.");
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-[#0a0f1c] p-4 transition-colors ${darkMode ? 'dark' : ''}`}>
      <Card className="w-full max-w-md shadow-[0_20px_50px_rgba(9,43,156,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-wider text-slate-800 dark:text-white">CLEARANCE<span className="text-[#092B9C] dark:text-blue-500">PORTAL</span></h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Log in to access your dashboard</p>
        </div>
        {error && <div className="bg-rose-100 text-rose-700 p-3 rounded-lg text-sm font-bold mb-4">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">School ID</label>
            <input type="text" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none transition" placeholder="e.g. 2024-001" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none transition" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full py-3 bg-[#092B9C] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition mt-4">Sign In</button>
          <div className="text-center mt-3">
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-bold text-[#092B9C] dark:text-blue-400 hover:underline">Forgot password?</button>
          </div>
        </form>
        <div className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
          Need an account? <Link to="/signup" className="text-[#092B9C] dark:text-blue-400 font-bold hover:underline">Register here</Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
