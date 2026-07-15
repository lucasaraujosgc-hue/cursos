import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CourseViewer from './pages/CourseViewer';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/conformidade" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/:slug" element={<CourseViewer />} />
      </Routes>
    </Router>
  );
}
