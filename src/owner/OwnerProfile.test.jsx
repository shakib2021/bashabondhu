import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { getOwnerVerification } from '../utils/ownerVerificationApi';
import { updateUserInfo } from '../utils/userApi';
import OwnerProfile from './OwnerProfile';

jest.mock('../utils/ownerVerificationApi', () => ({
  getOwnerVerification: jest.fn(),
  submitOwnerVerification: jest.fn(),
}));

jest.mock('../utils/userApi', () => ({
  updateUserInfo: jest.fn(),
}));

const profile = {
  id: 'owner-id',
  fullName: 'Mina Owner',
  email: 'owner@example.com',
  profileImage: '',
  phone: '',
  occupation: '',
  address: '',
  isVerified: false,
};

function OwnerProfileHarness({ onProfileUpdate }) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const handleProfileUpdate = (updatedProfile) => {
    setCurrentProfile(updatedProfile);
    onProfileUpdate(updatedProfile);
  };

  return <Outlet context={{ profile: currentProfile, onProfileUpdate: handleProfileUpdate }} />;
}

function renderOwnerProfile(onProfileUpdate = jest.fn()) {
  return render(
    <MemoryRouter initialEntries={['/owner/profile']}>
      <Routes>
        <Route path="/owner" element={<OwnerProfileHarness onProfileUpdate={onProfileUpdate} />}>
          <Route path="profile" element={<OwnerProfile />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getOwnerVerification.mockResolvedValue({ status: 'unverified' });
});

test('lets an owner edit profile details and updates the dashboard profile', async () => {
  const updatedProfile = {
    ...profile,
    fullName: 'Mina Rahman',
    phone: '01712345678',
    occupation: 'Landlord',
    address: 'Dhaka',
    profileImage: 'https://example.com/mina.jpg',
  };
  updateUserInfo.mockResolvedValue(updatedProfile);
  const onProfileUpdate = jest.fn();

  renderOwnerProfile(onProfileUpdate);
  await screen.findByRole('heading', { name: 'My profile' });
  expect(screen.getByRole('region', { name: 'Owner profile summary' })).toHaveTextContent('Mina Owner');
  expect(screen.getByText('Owner account')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));

  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Mina Rahman' } });
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '01712345678' } });
  fireEvent.change(screen.getByLabelText('Occupation'), { target: { value: 'Landlord' } });
  fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Dhaka' } });
  fireEvent.change(screen.getByLabelText('Profile image URL'), { target: { value: 'https://example.com/mina.jpg' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Your profile has been updated.');
  expect(updateUserInfo).toHaveBeenCalledWith({
    fullName: 'Mina Rahman',
    phone: '01712345678',
    occupation: 'Landlord',
    address: 'Dhaka',
    profileImage: 'https://example.com/mina.jpg',
  });
  expect(onProfileUpdate).toHaveBeenCalledWith(updatedProfile);
  expect(screen.getByRole('region', { name: 'Owner profile summary' })).toHaveTextContent('Mina Rahman');
  expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
});

test('keeps the profile form open and shows an error when saving fails', async () => {
  updateUserInfo.mockRejectedValue(new Error('Could not save your profile.'));

  renderOwnerProfile();
  await screen.findByRole('heading', { name: 'My profile' });
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your profile.');
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
});
