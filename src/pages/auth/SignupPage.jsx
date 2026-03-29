import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AppContext } from '../../context/AppContext';
import { Card } from '../../components/Navigation';
import { YEAR_DAYS, computeExpirationDate, getAccountStatus, getRemainingDays } from '../../utils/helpers';
import emailjs from '@emailjs/browser';

const SignupPage = () => {
  const { darkMode, courses, departments, students, setStudents, yearLevels, currentUser, eligibleStudents, offices } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: '', firstname: '', middlename: '', lastname: '', dob: '', gender: '', yearLevel: '', course: '', email: '', password: ''
  });

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verification States
  const [verificationStep, setVerificationStep] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [userCode, setUserCode] = useState('');

  const getDepartmentForCourse = (selectedCourse) => {
    const dept = departments.find(d => d.assignedCourses && d.assignedCourses.includes(selectedCourse));
    return dept ? dept.code : 'Unassigned';
  };

  const handleSendVerification = async (e) => {
    e.preventDefault();
    if (!formData.id || !formData.firstname || !formData.lastname || !formData.yearLevel || !formData.course || !formData.email || !formData.password) {
      return setError("Please fill in all required fields (including Year Level).");
    }

    // Step 1: Check if School ID is in the pre-approved registry
    const inputId = String(formData.id || '').trim().toLowerCase();
    const preRegisteredStudent = eligibleStudents.find(s => 
      String(s.school_id || '').trim().toLowerCase() === inputId
    );
    
    if (!preRegisteredStudent) return setError("This School ID is not in the registry. Please contact the administrator.");
    
    // Step 2: Strict Name Verification against registry (with robust string conversion)
    const regFirst = String(preRegisteredStudent.firstname || '').toLowerCase().trim();
    const regLast = String(preRegisteredStudent.lastname || '').toLowerCase().trim();
    const formFirst = String(formData.firstname || '').toLowerCase().trim();
    const formLast = String(formData.lastname || '').toLowerCase().trim();

    if (regFirst !== formFirst || regLast !== formLast) {
      return setError("The School ID and Name do not match our authorized registry. Please verify your details.");
    }

    // Step 3: Check if already registered
    const existingAccount = students.find(s => s.id === formData.id && s.signup_date);
    if (existingAccount) return setError("This School ID already has a registered account. Please log in instead.");

    setIsLoading(true);
    setError('');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    try {
      const templateParams = { to_email: formData.email, to_name: formData.firstname, message: `Your account verification code is: ${code}` };
      await emailjs.send('service_0r4tx49', 'template_gk42m8r', templateParams, 'hZ46URb2jaXrMXLME');
      setVerificationStep(true);
    } catch (err) {
      setError("Failed to send verification email: " + (err.message || JSON.stringify(err)));
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    if (userCode !== generatedCode) return setError("Invalid verification code.");

    setIsLoading(true);
    const assignedDept = getDepartmentForCourse(formData.course);
    const fullName = `${formData.firstname} ${formData.middlename} ${formData.lastname}`.replace(/\s+/g, ' ').trim();

    const signupDate = new Date().toISOString().split('T')[0];
    const expirationDate = computeExpirationDate(signupDate, formData.yearLevel);

    // Step 1: Upsert ONLY safe/universal columns — avoids schema cache rejection
    const insertData = {
      id: formData.id.trim(),
      name: fullName,
      firstname: formData.firstname.trim(),
      middlename: formData.middlename.trim() || null,
      lastname: formData.lastname.trim(),
      dob: formData.dob || null,
      gender: formData.gender || null,
      yearLevel: formData.yearLevel,
      course: formData.course,
      email: formData.email,
      password: formData.password,
      signup_date: signupDate,
      expiration_date: expirationDate,
      account_status: 'Active',
      status: 'PENDING',
    };

    const { error: dbError } = await supabase.from('students').upsert(insertData);

    if (dbError) {
      setIsLoading(false);
      return setError("Registration failed: " + dbError.message);
    }

    // Step 2: Write department + office_clearances separately (schema-cache-tolerant)
    const initialClearances = {};
    (offices || []).forEach(o => { initialClearances[o] = 'Pending'; });
    const extraFields = { department: assignedDept };
    if (Object.keys(initialClearances).length > 0) {
      extraFields.office_clearances = initialClearances;
    }
    await supabase.from('students').update(extraFields).eq('id', formData.id.trim());

    setIsLoading(false);
    const fullInsertData = { ...insertData, office_clearances: initialClearances };

    if (typeof setStudents === 'function') {
      setStudents(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        const exists = arr.findIndex(s => s.id === formData.id);
        if (exists > -1) {
          const copy = [...arr];
          copy[exists] = { ...copy[exists], ...fullInsertData };
          return copy;
        }
        return [...arr, fullInsertData];
      });
    }
    setSuccess(true);
    setTimeout(() => navigate('/login'), 2500);
  };

  if (verificationStep) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-[#0a0f1c] p-4 transition-colors ${darkMode ? 'dark' : ''}`}>
        <Card className="w-full max-w-md shadow-[0_20px_50px_rgba(9,43,156,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200/50 dark:border-slate-800/50 relative">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Verify Email</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">We sent a 6-digit code to {formData.email}</p>
          </div>
          {error && <div className="bg-rose-100 text-rose-700 p-3 rounded-lg text-sm font-bold mb-4">{error}</div>}
          {success && <div className="bg-emerald-100 text-emerald-800 p-3 rounded-lg text-sm font-bold mb-4">Verification successful! Redirecting...</div>}
          {!success && (
            <form onSubmit={handleVerifyAndSignup} className="space-y-4">
              <input type="text" value={userCode} onChange={e => setUserCode(e.target.value)} className="w-full p-4 text-center text-2xl tracking-widest border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="000000" maxLength={6} required />
              <button type="submit" disabled={isLoading} className="w-full py-3 bg-[#092B9C] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50">
                {isLoading ? 'Verifying...' : 'Verify Email & Setup Account'}
              </button>
              <button type="button" onClick={() => setVerificationStep(false)} className="w-full py-2 mt-2 text-slate-500 hover:underline text-sm font-bold">Go Back</button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-[#0a0f1c] p-4 transition-colors py-12 overflow-y-auto ${darkMode ? 'dark' : ''}`}>
      <Card className="w-full max-w-2xl shadow-[0_20px_50px_rgba(9,43,156,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200/50 dark:border-slate-800/50 relative">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black tracking-wider text-slate-800 dark:text-white">STUDENT<span className="text-[#092B9C] dark:text-blue-500">REGISTRATION</span></h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Create your official clearance portal account</p>
        </div>

        {error && <div className="bg-rose-100 text-rose-700 p-3 rounded-lg text-sm font-bold mb-4">{error}</div>}
        {success && <div className="bg-emerald-100 text-emerald-800 p-3 rounded-lg text-sm font-bold mb-4">Registration successful! Redirecting to login...</div>}

        <form onSubmit={handleSendVerification} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Student ID (School ID) <span className="text-rose-500">*</span></label>
              <input type="text" value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="e.g. 2024-0001" required />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">First Name <span className="text-rose-500">*</span></label>
              <input type="text" value={formData.firstname} onChange={e => setFormData({ ...formData, firstname: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="First Name" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Last Name <span className="text-rose-500">*</span></label>
              <input type="text" value={formData.lastname} onChange={e => setFormData({ ...formData, lastname: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="Last Name" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Middle Name <span className="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" value={formData.middlename} onChange={e => setFormData({ ...formData, middlename: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="Middle Name" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
              <input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
              <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Year Level <span className="text-rose-500">*</span></label>
              <select value={formData.yearLevel} onChange={e => setFormData({ ...formData, yearLevel: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" required>
                <option value="" disabled>Select Year</option>
                {yearLevels.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t dark:border-slate-700 pt-6">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Course <span className="text-rose-500">*</span></label>
            <select value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" required>
              <option value="" disabled>Select your course</option>
              {courses.map(c => <option key={c.id} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
            {formData.course && (
              <p className="text-xs font-bold mt-2 text-emerald-600 dark:text-emerald-400">
                Assigned to: {getDepartmentForCourse(formData.course)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t dark:border-slate-700 pt-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email <span className="text-slate-500 dark:text-slate-400 font-normal">(for password resets)</span> <span className="text-rose-500">*</span></label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Password <span className="text-rose-500">*</span></label>
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-[#092B9C] outline-none" placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#092B9C] hover:bg-blue-800 text-white font-black text-lg rounded-xl shadow-lg transition mt-4 disabled:opacity-50">
            {isLoading ? 'Processing...' : 'Complete Registration'}
          </button>
        </form>
        <div className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
          Already have one? <Link to="/login" className="text-[#092B9C] dark:text-blue-400 font-bold hover:underline">Sign In</Link>
        </div>
      </Card>
    </div>
  );
};

export default SignupPage;
