import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/public/Home';
import PropertyDetails from './pages/public/PropertyDetails';
import Marketplace from './pages/public/Marketplace';
import MarketplaceItemDetails from './pages/public/MarketplaceItemDetails';
import SellMarketplaceItem from './pages/public/SellMarketplaceItem';
import MyMarketplace from './pages/public/MyMarketplace';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import TenantDashboard from './tenant/TenantDashboard';
import OwnerLayout from './owner/OwnerLayout';
import OwnerDashboard from './owner/OwnerDashboard';
import OwnerProfile from './owner/OwnerProfile';
import MyProperties from './owner/MyProperties';
import AddProperty from './owner/AddProperty';
import ContactRequests from './owner/ContactRequests';
import VisitRequests from './owner/VisitRequests';
import OwnerVerifications from './admin/OwnerVerifications';
import AdminLayout from './admin/AdminLayout';
import AdminOverview from './admin/AdminOverview';
import AdminPosts from './admin/AdminPosts';
import AdminReports from './admin/AdminReports';
import AdminUsers from './admin/AdminUsers';
import AdminUserDetails from './admin/AdminUserDetails';
import AdminProfile from './admin/AdminProfile';
import HowToUse from './pages/public/HowToUse';
import ChatInbox from './pages/public/ChatInbox';

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties/:propertyId" element={<PropertyDetails />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/items/:itemId" element={<MarketplaceItemDetails />} />
          <Route path="/marketplace/sell" element={<SellMarketplaceItem />} />
          <Route path="/marketplace/my-listings" element={<MyMarketplace />} />
          <Route path="/messages" element={<ChatInbox />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          <Route path="/tenant/dashboard" element={<TenantDashboard />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="verifications" element={<OwnerVerifications />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:userId" element={<AdminUserDetails />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<OwnerDashboard />} />
            <Route path="profile" element={<OwnerProfile />} />
            <Route path="contact-requests" element={<ContactRequests />} />
            <Route path="visit-requests" element={<VisitRequests />} />
            <Route path="properties" element={<MyProperties />} />
            <Route path="properties/new" element={<AddProperty />} />
            <Route path="properties/:propertyId/edit" element={<AddProperty />} />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
