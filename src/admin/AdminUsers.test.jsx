import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminUserDetails from './AdminUserDetails';
import AdminUsers from './AdminUsers';
import { getAdminUserDetails, getAdminUsers, warnAdminUser } from '../utils/adminApi';

vi.mock('../utils/adminApi', () => ({
  getAdminUserDetails: vi.fn(),
  getAdminUsers: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  warnAdminUser: vi.fn(),
}));

const userId = '650000000000000000000073';

beforeEach(() => {
  getAdminUsers.mockResolvedValue([{
    id: userId,
    fullName: 'Rina Owner',
    email: 'rina@example.com',
    phone: '+8801700000000',
    role: 'owner',
    accountStatus: 'active',
    warningCount: 0,
    isVerified: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  }]);
  getAdminUserDetails.mockResolvedValue({
    id: userId,
    fullName: 'Rina Owner',
    email: 'rina@example.com',
    phone: '+8801700000000',
    address: 'Dhaka',
    occupation: 'Teacher',
    role: 'owner',
    authProvider: 'google',
    accountStatus: 'active',
    ownerVerificationStatus: 'pending',
    warnings: [{ id: 'warning-1', reason: 'Provide accurate listing details.', createdAt: '2026-01-03T00:00:00.000Z' }],
    properties: [{
      id: 'property-1',
      title: 'Sunny room',
      accommodationType: 'Rental room',
      location: 'Dhanmondi',
      city: 'Dhaka',
      monthlyRent: 25000,
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      facilities: [],
      status: 'Available',
      moderationStatus: 'approved',
    }],
    marketplacePosts: [{
      id: 'item-1',
      title: 'Desk',
      price: 5000,
      condition: 'Good',
      location: 'Dhaka',
      status: 'available',
      moderationStatus: 'approved',
    }],
  });
  warnAdminUser.mockResolvedValue({ warningCount: 1 });
});

function renderAdminUsersRoutes() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetails />} />
      </Routes>
    </MemoryRouter>,
  );
}

test('admins can send a written warning and see the updated warning count', async () => {
  renderAdminUsersRoutes();

  await screen.findByText('Rina Owner');
  fireEvent.click(screen.getByRole('button', { name: 'Give warning' }));
  fireEvent.change(screen.getByLabelText('Warning message'), {
    target: { value: 'Provide accurate listing details.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send warning' }));

  await waitFor(() => {
    expect(warnAdminUser).toHaveBeenCalledWith(userId, 'Provide accurate listing details.');
  });
  expect(await screen.findByText('1')).toBeInTheDocument();
});

test('user name and email open a private details page with their posts', async () => {
  renderAdminUsersRoutes();

  fireEvent.click(await screen.findByRole('link', { name: 'rina@example.com' }));

  expect(await screen.findByRole('heading', { name: 'Rina Owner' })).toBeInTheDocument();
  expect(getAdminUserDetails).toHaveBeenCalledWith(userId);
  expect(screen.getByText('+8801700000000')).toBeInTheDocument();
  expect(screen.getByText('Warnings (1)')).toBeInTheDocument();
  expect(screen.getByText('Sunny room')).toBeInTheDocument();
  expect(screen.getByText('Desk')).toBeInTheDocument();
});
