import { Navigate, useRoutes } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Login from '../pages/Login';
import Layout from '../pages/Layout';
import Staff from '../pages/Staff';
import Customers from '../pages/Customers';
import CardIssue from '../pages/Cards/Issue';
import CardList from '../pages/Cards/List';
import CardVerify from '../pages/Cards/Verify';
import CardRecharge from '../pages/Cards/Recharge';
import Transactions from '../pages/Transactions';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
}

export default function AppRouter() {
  return useRoutes([
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: <PrivateRoute><Layout /></PrivateRoute>,
      children: [
        { index: true, element: <Navigate to="/cards" /> },
        { path: 'staff', element: <Staff /> },
        { path: 'customers', element: <Customers /> },
        { path: 'cards', element: <CardList /> },
        { path: 'cards/issue', element: <CardIssue /> },
        { path: 'cards/verify', element: <CardVerify /> },
        { path: 'cards/recharge', element: <CardRecharge /> },
        { path: 'transactions', element: <Transactions /> },
      ],
    },
    { path: '*', element: <Navigate to="/" /> },
  ]);
}
