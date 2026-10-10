import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import TenantDashboard from './tenant/TenantDashboard';
import OwnerLayout from './owner/OwnerLayout';
import OwnerDashboard from './owner/OwnerDashboard';
import MyProperties from './owner/MyProperties';
import AddProperty from './owner/AddProperty';

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<OwnerDashboard />} />
            <Route path="properties" element={<MyProperties />} />
            <Route path="properties/new" element={<AddProperty />} />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
