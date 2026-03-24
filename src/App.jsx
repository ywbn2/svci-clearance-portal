import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, AppContext } from './context/AppContext';
import { ProtectedAdminLayout, StudentPortalLayout } from './components/Navigation';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/admin/DashboardPage';
import StudentsPage from './pages/admin/StudentsPage';
import SignatoriesPage from './pages/admin/SignatoriesPage';
import AdminPage from './pages/admin/AdminUsersPage';
import CoursesPage from './pages/admin/CoursesPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import YearLevelsPage from './pages/admin/YearLevelsPage';
import RequirementsPage from './pages/admin/RequirementsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import EligibleStudentsPage from './pages/admin/EligibleStudentsPage';
import SignatoryDashboardPage from './pages/signatory/SignatoryDashboardPage';
import SignatoryStudentsPage from './pages/signatory/SignatoryStudentsPage';
import StudentDashboardPage from './pages/student/StudentDashboard';
import StudentProfilePage from './pages/student/StudentProfilePage';

const InnerAppRoutes = () => {
  const { currentUser } = useContext(AppContext);

  const isStudent = currentUser?.roleType === 'Student';
  const isSignatory = currentUser?.roleType === 'Signatory';

  return (
    <Routes>
      {/* Public routes always available */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* If not logged in, show login page for all other routes */}
      {!currentUser && (
        <>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}

      {/* If logged in as student */}
      {isStudent && (
        <>
          <Route element={<StudentPortalLayout />}>
            <Route path="/" element={<StudentDashboardPage />} />
            <Route path="/profile" element={<StudentProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </>
      )}

      {/* If logged in as admin or signatory */}
      {currentUser && !isStudent && (
        <Route path="/*" element={
          <ProtectedAdminLayout>
            <Routes>
              <Route path="/" element={
                isSignatory ? <SignatoryDashboardPage /> : <DashboardPage />
              } />
              <Route path="/profile" element={<StudentProfilePage />} />
              <Route path="/students" element={
                isSignatory ? <SignatoryStudentsPage /> : <StudentsPage />
              } />
              {/* Admin-only routes — redirect signatories to dashboard */}
              <Route path="/signatories" element={isSignatory ? <Navigate to="/" replace /> : <SignatoriesPage />} />
              <Route path="/admin" element={isSignatory ? <Navigate to="/" replace /> : <AdminPage />} />
              <Route path="/courses" element={isSignatory ? <Navigate to="/" replace /> : <CoursesPage />} />
              <Route path="/departments" element={isSignatory ? <Navigate to="/" replace /> : <DepartmentsPage />} />
              <Route path="/year-levels" element={isSignatory ? <Navigate to="/" replace /> : <YearLevelsPage />} />
              {/* Shared routes */}
              <Route path="/requirements" element={<RequirementsPage />} />
              <Route path="/logs" element={<AuditLogsPage />} />
              <Route path="/eligible-students" element={isSignatory ? <Navigate to="/" replace /> : <EligibleStudentsPage />} />
            </Routes>
          </ProtectedAdminLayout>
        } />
      )}
    </Routes>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Router>
        <InnerAppRoutes />
      </Router>
    </AppProvider>
  );
}