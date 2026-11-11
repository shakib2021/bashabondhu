import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { updateUserInfo } from '../utils/userApi';
import AdminProfile from './AdminProfile';

jest.mock('../utils/userApi', () => ({
  updateUserInfo: jest.fn(),
}));

const profile = {
  id: 'admin-id',
  fullName: 'Site Admin',
  email: 'admin@example.com',
  profileImage: '',
  phone: '',
  occupation: '',
  address: '',
  role: 'admin',
};

function AdminProfileHarness() {
  const [currentProfile, setCurrentProfile] = useState(profile);
  return <Outlet context={{ profile: currentProfile, onProfileUpdate: setCurrentProfile }} />;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('lets an administrator update their profile details', async () => {
  const updatedProfile = { ...profile, fullName: 'Sam Admin', phone: '01712345678' };
  updateUserInfo.mockResolvedValue(updatedProfile);

  render(
    <MemoryRouter initialEntries={['/admin/profile']}>
      <Routes>
        <Route path="/admin" element={<AdminProfileHarness />}>
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('region', { name: 'Admin profile summary' })).toHaveTextContent('Site Admin');
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Sam Admin' } });
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01712345678' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  await waitFor(() => {
    expect(updateUserInfo).toHaveBeenCalledWith({
      fullName: 'Sam Admin',
      phone: '01712345678',
      occupation: null,
      address: null,
      profileImage: null,
    });
  });
  expect(await screen.findByRole('status')).toHaveTextContent('Your profile has been updated.');
});
