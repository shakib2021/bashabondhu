import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getStoredUser } from '../utils/authStorage';
import { getUserInfo } from '../utils/userApi';
import TenantDashboard from './TenantDashboard';

vi.mock('../utils/authStorage', () => ({
  clearUserProfile: vi.fn(),
  getStoredUser: vi.fn(),
}));

vi.mock('../utils/userApi', () => ({
  getUserInfo: vi.fn(),
  updateUserInfo: vi.fn(),
}));

vi.mock('../components/common/NotificationMenu', () => ({ default: () => <div /> }));
vi.mock('../components/common/WatchlistPanel', () => ({ default: () => <div /> }));

beforeEach(() => {
  getStoredUser.mockReturnValue({ email: 'tenant@example.com', name: 'Tara Tenant' });
  getUserInfo.mockResolvedValue({
    id: 'tenant-id',
    role: 'tenant',
    fullName: 'Tara Tenant',
    email: 'tenant@example.com',
    profileImage: '',
    phone: '01712345678',
    occupation: 'Student',
    address: 'Dhaka',
  });
});

test('shows the shared profile identity design for tenant accounts', async () => {
  render(
    <MemoryRouter>
      <TenantDashboard />
    </MemoryRouter>,
  );

  const profileSummary = await screen.findByRole('region', { name: 'Tenant profile summary' });
  expect(profileSummary).toHaveTextContent('Tara Tenant');
  expect(profileSummary).toHaveTextContent('tenant@example.com');
  expect(profileSummary).toHaveTextContent('Tenant account');
  expect(profileSummary).toHaveTextContent('5');
});
