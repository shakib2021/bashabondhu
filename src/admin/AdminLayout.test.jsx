import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getStoredUser } from '../utils/authStorage';
import { getUserInfo } from '../utils/userApi';
import AdminLayout from './AdminLayout';

jest.mock('../utils/authStorage', () => ({
  clearUserProfile: jest.fn(),
  getStoredUser: jest.fn(),
}));

jest.mock('../utils/userApi', () => ({
  getUserInfo: jest.fn(),
}));

function renderAdminRoutes() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<h1>Admin overview</h1>} />
          <Route path="users" element={<h1>User management</h1>} />
        </Route>
        <Route path="/owner" element={<p>Owner workspace</p>} />
        <Route path="/tenant/dashboard" element={<p>Tenant workspace</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getStoredUser.mockReturnValue({
    email: 'admin@example.com',
    role: 'admin',
    token: 'admin-token',
  });
  getUserInfo.mockResolvedValue({
    id: 'admin-id',
    fullName: 'Site Admin',
    email: 'admin@example.com',
    profileImage: '',
    role: 'admin',
  });
});

test('shows admin navigation and the overview to an administrator', async () => {
  renderAdminRoutes();

  expect(await screen.findByRole('heading', { name: 'Admin overview' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Admin navigation' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /pending verification/i })).toHaveAttribute('href', '/admin/verifications');
  expect(screen.getByText('Site Admin')).toBeInTheDocument();
});

test('redirects an owner away from the admin workspace', async () => {
  getUserInfo.mockResolvedValue({
    id: 'owner-id',
    fullName: 'Property Owner',
    email: 'owner@example.com',
    role: 'owner',
  });

  renderAdminRoutes();

  expect(await screen.findByText('Owner workspace')).toBeInTheDocument();
});
