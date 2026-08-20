import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getSession } from './api/api';
import SessionWatcher from './components/SessionWatcher';

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangeCredentials from './pages/ChangeCredentials';
import ItemForm from './pages/ItemForm';
import TapToPay from './pages/TapToPay';

import UserWallet from './pages/user/UserWallet';
import UserTransactions from './pages/user/UserTransactions';

import InstitutionWallet from './pages/institution/InstitutionWallet';
import InstitutionItems from './pages/institution/InstitutionItems';
import InstitutionActivity from './pages/institution/InstitutionActivity';
import InstitutionWithdraw from './pages/institution/InstitutionWithdraw';

import AdminDashboard from './pages/AdminDashboard';
import AdminAddCards from './pages/admin/AdminAddCards';
import AdminCardList from './pages/admin/AdminCardList';
import AdminRegisterCustomer from './pages/admin/AdminRegisterCustomer';
import AdminRegisterInstitution from './pages/admin/AdminRegisterInstitution';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminInstitutions from './pages/admin/AdminInstitutions';
import AdminManageAdmins from './pages/admin/AdminManageAdmins';
import AdminUpdateUser from './pages/admin/AdminUpdateUser';

function ProtectedRoute({ children, role }) {
  const session = getSession();
  if (!session.token) return <Navigate to="/login" replace />;
  if (role && session.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <SessionWatcher />
      <Routes>
      {/* Self-registration is disabled - only administrators can create
          accounts (see AdminController's /admin/cards/{cardNo}/register-customer
          and /admin/institutions). */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-credentials" element={
        <ProtectedRoute><ChangeCredentials /></ProtectedRoute>
      } />

      {/* Each dashboard section below is its own real route/page, not an
          anchor jump within one long scrolling page. */}
      <Route path="/user" element={
        <ProtectedRoute role="USER"><UserWallet /></ProtectedRoute>
      } />
      <Route path="/user/transactions" element={
        <ProtectedRoute role="USER"><UserTransactions /></ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/admin/update-user" element={
        <ProtectedRoute role="ADMIN"><AdminUpdateUser /></ProtectedRoute>
      } />
      <Route path="/admin/register-customer" element={
        <ProtectedRoute role="ADMIN"><AdminRegisterCustomer /></ProtectedRoute>
      } />
      <Route path="/admin/register-institution" element={
        <ProtectedRoute role="ADMIN"><AdminRegisterInstitution /></ProtectedRoute>
      } />
      <Route path="/admin/add-cards" element={
        <ProtectedRoute role="ADMIN"><AdminAddCards /></ProtectedRoute>
      } />
      <Route path="/admin/card-list" element={
        <ProtectedRoute role="ADMIN"><AdminCardList /></ProtectedRoute>
      } />
      <Route path="/admin/customers" element={
        <ProtectedRoute role="ADMIN"><AdminCustomers /></ProtectedRoute>
      } />
      <Route path="/admin/institutions" element={
        <ProtectedRoute role="ADMIN"><AdminInstitutions /></ProtectedRoute>
      } />
      <Route path="/admin/admins" element={
        <ProtectedRoute role="ADMIN"><AdminManageAdmins /></ProtectedRoute>
      } />

      <Route path="/institution" element={
        <ProtectedRoute role="INSTITUTION"><InstitutionWallet /></ProtectedRoute>
      } />
      <Route path="/institution/items" element={
        <ProtectedRoute role="INSTITUTION"><InstitutionItems /></ProtectedRoute>
      } />
      <Route path="/institution/activity" element={
        <ProtectedRoute role="INSTITUTION"><InstitutionActivity /></ProtectedRoute>
      } />
      <Route path="/institution/withdraw" element={
        <ProtectedRoute role="INSTITUTION"><InstitutionWithdraw /></ProtectedRoute>
      } />
      <Route path="/institution/add-item" element={
        <ProtectedRoute role="INSTITUTION"><ItemForm /></ProtectedRoute>
      } />
      <Route path="/institution/edit-item/:itemId" element={
        <ProtectedRoute role="INSTITUTION"><ItemForm /></ProtectedRoute>
      } />

      {/* Public payment terminal - shown on the tap & pay kiosk, not behind login */}
      <Route path="/pay/:institutionId" element={<TapToPay />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
