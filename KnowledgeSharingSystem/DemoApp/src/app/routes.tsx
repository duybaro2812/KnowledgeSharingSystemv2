import { createBrowserRouter } from 'react-router';

// Layouts
import UserLayout from './components/layouts/UserLayout';
import ModeratorLayout from './components/layouts/ModeratorLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Auth
import SignIn from './pages/auth/SignIn';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// User
import Home from './pages/user/Home';
import Browse from './pages/user/Browse';
import DocumentDetail from './pages/user/DocumentDetail';
import UploadDocument from './pages/user/UploadDocument';
import EditDocument from './pages/user/EditDocument';
import MyDocuments from './pages/user/MyDocuments';
import Library from './pages/user/Library';
import Profile from './pages/user/Profile';
import Points from './pages/user/Points';
import Notifications from './pages/user/Notifications';
import QAList from './pages/user/QAList';
import QASession from './pages/user/QASession';

// Moderator
import ModDashboard from './pages/moderator/ModDashboard';
import PendingDocuments from './pages/moderator/PendingDocuments';
import PendingComments from './pages/moderator/PendingComments';
import PlagiarismAlerts from './pages/moderator/PlagiarismAlerts';
import Reports from './pages/moderator/Reports';
import PointEvents from './pages/moderator/PointEvents';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import Categories from './pages/admin/Categories';

export const router = createBrowserRouter([
  // Auth routes
  { path: '/auth/signin',   Component: SignIn },
  { path: '/auth/register', Component: Register },
  { path: '/auth/verify',   Component: VerifyOTP },
  { path: '/auth/forgot',   Component: ForgotPassword },
  { path: '/auth/reset',    Component: ResetPassword },

  // User routes
  {
    path: '/',
    Component: UserLayout,
    children: [
      { index: true,              Component: Home },
      { path: 'browse',           Component: Browse },
      { path: 'document/:id',     Component: DocumentDetail },
      { path: 'upload',           Component: UploadDocument },
      { path: 'edit/:id',         Component: EditDocument },
      { path: 'my-documents',     Component: MyDocuments },
      { path: 'library',          Component: Library },
      { path: 'profile',          Component: Profile },
      { path: 'points',           Component: Points },
      { path: 'notifications',    Component: Notifications },
      { path: 'qa',               Component: QAList },
      { path: 'qa/:id',           Component: QASession },
    ],
  },

  // Moderator routes
  {
    path: '/moderator',
    Component: ModeratorLayout,
    children: [
      { index: true,              Component: ModDashboard },
      { path: 'documents',        Component: PendingDocuments },
      { path: 'comments',         Component: PendingComments },
      { path: 'points',           Component: PointEvents },
      { path: 'reports',          Component: Reports },
      { path: 'plagiarism',       Component: PlagiarismAlerts },
    ],
  },

  // Admin routes
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      { index: true,              Component: AdminDashboard },
      { path: 'users',            Component: UserManagement },
      { path: 'audit',            Component: AuditLogs },
      { path: 'categories',       Component: Categories },
    ],
  },
]);
