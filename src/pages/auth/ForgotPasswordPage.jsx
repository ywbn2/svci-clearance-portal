import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import emailjs from '@emailjs/browser';

const ForgotPasswordPage = () => {
  const { darkMode, students, adminUsers, signatories, currentUser, showToast } = useContext(AppContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);
  
  const [step, setStep] = useState(0); 
  const [email, setEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [matchedUserParams, setMatchedUserParams] = useState(null);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError('');

    let matchedUser = null;
    let table = '';
    
    const sMatch = students.find(s => s.email === email);
    if (sMatch) { matchedUser = sMatch; table = 'students'; }
    else {
      const aMatch = adminUsers.find(a => a.email === email);
      if (aMatch) { matchedUser = aMatch; table = 'admin_users'; }
      else {
        const sigMatch = signatories.find(si => si.email === email);
        if (sigMatch) { matchedUser = sigMatch; table = 'signatories'; }
      }
    }

    if (!matchedUser) {
      setIsLoading(false);
      return setError("Email not registered in the system.");
    }

    setMatchedUserParams({ id: matchedUser.id, table });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    try {
      const templateParams = { to_email: email, to_name: matchedUser.name || matchedUser.firstname || "User", message: `Your password reset code is: ${code}` };
      await emailjs.send('service_0r4tx49', 'template_gk42m8r', templateParams, 'hZ46URb2jaXrMXLME');
      setStep(1);
    } catch (err) {
      console.error("EmailJS Error:", err);
      setError("Failed to send email: " + (err.text || err.message || "Unknown error. Check EmailJS settings."));
    }
    setIsLoading(false);
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (userCode !== generatedCode) return setError("Invalid verification code.");
    setError('');
    setStep(2);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    setIsLoading(true);
    setError('');

    const { error: dbError } = await supabase.from(matchedUserParams.table).update({ password: newPassword }).eq('id', matchedUserParams.id);
    
    setIsLoading(false);
    if (dbError) setError("Failed to reset password.");
    else {
      showToast("Password successfully reset!");
      navigate('/login');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-[#0a0f1c] p-4 transition-colors ${darkMode ? 'dark' : ''}`}>
      <Card className="w-full max-w-md shadow-[0_20px_50px_rgba(9,43,156,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200/50 dark:border-slate-800/50 relative">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Recover Password</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
             {step === 0 ? "Enter your registered email address" : step === 1 ? "Enter 6-digit verification code" : "Create a new strong password"}
          </p>
        </div>
        
        {error && <div className="bg-rose-100 text-rose-700 p-3 rounded-lg text-sm font-bold mb-4">{error}</div>}

        {step === 0 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none transition" placeholder="you@example.com" required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-[#092B9C] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition mt-4 disabled:opacity-50">
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
            <div className="text-center mt-3">
              <button type="button" onClick={() => navigate('/login')} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:underline">Back to Login</button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <input type="text" value={userCode} onChange={e=>setUserCode(e.target.value)} className="w-full p-4 text-center text-2xl tracking-widest border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="000000" maxLength={6} required />
            <button type="submit" className="w-full py-3 bg-[#092B9C] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50">
              Verify Code
            </button>
            <button type="button" onClick={() => setStep(0)} className="w-full py-2 mt-2 text-slate-500 hover:underline text-sm font-bold">Cancel</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none transition" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-[#092B9C] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50">
              {isLoading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
