// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home      from './components/Home';
import Signup    from './components/Signup';
import Login     from './components/Login';
import Dashboard from './components/Dashboard';
import Upload    from './components/Upload';
import CSVViewer from './components/CSVViewer';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  // While we’re checking the session, don’t render or redirect
  if (loading) {
    return <div style={{ padding: 20 }}>⏳ Checking authentication…</div>;
  }

  // Once loading is done, only allow through if we have a user
  return user
    ? children
    : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/"        element={<Home />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/signup"  element={<Signup />} />

        {/* Private */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }/>
        <Route path="/upload" element={
          <PrivateRoute>
            <Upload />
          </PrivateRoute>
        }/>
        <Route path="/files/:id" element={
          <PrivateRoute>
            <CSVViewer />
          </PrivateRoute>
        }/>
        

        {/* Catch-all to redirect back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
