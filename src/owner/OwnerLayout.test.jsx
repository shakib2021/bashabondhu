import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getStoredUser } from '../utils/authStorage';
import { createProperty, getMyProperties } from '../utils/propertyApi';
import { getNotifications, markNotificationRead } from '../utils/notificationApi';
import { getOwnerContactRequests, updateContactRequest } from '../utils/contactRequestApi';
import AddProperty from './AddProperty';
import ContactRequests from './ContactRequests';
import OwnerDashboard from './OwnerDashboard';
import OwnerLayout from './OwnerLayout';
import OwnerProfile from './OwnerProfile';

const mockMaybeSingle = jest.fn();
const originalFetch = global.fetch;

jest.mock('../utils/authStorage', () => ({
  getStoredUser: jest.fn(),
}));

jest.mock('../utils/propertyApi', () => ({
  createProperty: jest.fn(),
  getMyProperties: jest.fn(),
}));

jest.mock('../utils/notificationApi', () => ({
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
}));

jest.mock('../utils/contactRequestApi', () => ({
  getOwnerContactRequests: jest.fn(),
  updateContactRequest: jest.fn(),
}));

function renderOwnerRoutes() {
  return render(
    <MemoryRouter initialEntries={['/owner']}>
      <Routes>
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<OwnerDashboard />} />
          <Route path="profile" element={<OwnerProfile />} />
          <Route path="contact-requests" element={<ContactRequests />} />
          <Route path="properties/new" element={<AddProperty />} />
        </Route>
        <Route path="/properties/:propertyId" element={<p>Property detail</p>} />
        <Route path="/tenant/dashboard" element={<p>Tenant dashboard</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getNotifications.mockResolvedValue([]);
  markNotificationRead.mockResolvedValue({ isRead: true });
  getOwnerContactRequests.mockResolvedValue([]);
  updateContactRequest.mockImplementation(async (requestId, status) => ({ _id: requestId, status }));
  createProperty.mockResolvedValue({
    _id: 'saved-property',
    title: 'Sunny rental room',
    accommodation_type: 'Rental room',
    location: 'Dhanmondi',
    city: 'Dhaka',
    monthly_rent: 25000,
    number_of_rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    status: 'Available',
    gender: 'any',
    rating: 0,
  });
  getMyProperties.mockResolvedValue([]);
  mockMaybeSingle.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-owner',
        fullName: 'Mina Owner',
        email: 'owner@example.com',
        profileImage: null,
        role: 'owner',
      },
    }),
  });
  global.fetch = mockMaybeSingle;
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('shows the owner workspace to a signed-in owner', async () => {
  getStoredUser.mockReturnValue({ id: 'mongo-owner', email: 'owner@example.com', role: 'owner', token: 'signed-token' });

  renderOwnerRoutes();

  expect(await screen.findByRole('heading', { name: /welcome home, mina/i })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /owner navigation/i })).toBeInTheDocument();
});

test('opens notifications and the owner profile from the top bar', async () => {
  getStoredUser.mockReturnValue({ id: 'mongo-owner', email: 'owner@example.com', role: 'owner', token: 'signed-token' });

  renderOwnerRoutes();

  expect(await screen.findByRole('heading', { name: /welcome home, mina/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(screen.getByText('You’re all caught up.')).toBeInTheDocument();
  fireEvent.click(within(document.querySelector('.owner-topbar')).getByRole('link', { name: 'My profile' }));
  expect(await screen.findByRole('heading', { name: 'My profile' })).toBeInTheDocument();
  expect(screen.getByText('owner@example.com')).toBeInTheDocument();
});

test('links owner notifications to the exact reply and marks them read', async () => {
  getNotifications.mockResolvedValueOnce([{
    _id: '650000000000000000000021',
    type: 'reply',
    title: 'Helpful Tenant replied to a comment',
    message: 'Sunny room: I can view this weekend.',
    propertyId: '650000000000000000000011',
    propertyTitle: 'Sunny room',
    commentId: '650000000000000000000012',
    replyId: '650000000000000000000013',
    isRead: false,
    createdAt: new Date().toISOString(),
  }]);
  getStoredUser.mockReturnValue({ id: 'mongo-owner', email: 'owner@example.com', role: 'owner', token: 'signed-token' });

  renderOwnerRoutes();

  await screen.findByRole('heading', { name: /welcome home, mina/i });
  const notificationButton = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
  fireEvent.click(notificationButton);
  const notificationLink = await screen.findByRole('link', { name: /helpful tenant replied to a comment/i });
  expect(notificationLink).toHaveAttribute(
    'href',
    '/properties/650000000000000000000011#reply-650000000000000000000013',
  );

  fireEvent.click(notificationLink);
  expect(markNotificationRead).toHaveBeenCalledWith('650000000000000000000021');
});

test('shows the source listing for a contact request and lets the owner accept it', async () => {
  getOwnerContactRequests.mockResolvedValueOnce([{
    _id: '650000000000000000000031',
    status: 'pending',
    requesterName: 'Helpful Tenant',
    requesterEmail: 'tenant@example.com',
    createdAt: new Date().toISOString(),
    property: {
      _id: '650000000000000000000041',
      title: 'Dhanmondi room',
      city: 'Dhaka',
      location: 'Dhanmondi',
    },
  }]);
  getStoredUser.mockReturnValue({ id: 'mongo-owner', email: 'owner@example.com', role: 'owner', token: 'signed-token' });

  renderOwnerRoutes();
  await screen.findByRole('heading', { name: /welcome home, mina/i });
  fireEvent.click(screen.getByRole('link', { name: 'Contact requests' }));

  expect(await screen.findByText('Helpful Tenant')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Dhanmondi room' })).toHaveAttribute(
    'href',
    '/properties/650000000000000000000041',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

  expect(await screen.findByText('accepted')).toBeInTheDocument();
  expect(updateContactRequest).toHaveBeenCalledWith('650000000000000000000031', 'accepted');
});

test('shows listing totals and recent property data on the owner dashboard', async () => {
  mockMaybeSingle.mockReset();
  mockMaybeSingle
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: {
          id: 'mongo-owner',
          fullName: 'Mina Owner',
          email: 'owner@example.com',
          profileImage: null,
          role: 'owner',
        },
      }),
    });
  getMyProperties.mockResolvedValueOnce([
    { _id: 'available', title: 'Sunny room', accommodation_type: 'Rental room', location: 'Dhanmondi', city: 'Dhaka', monthly_rent: 25000, status: 'Available' },
    { _id: 'booked', title: 'Quiet sublet', accommodation_type: 'Sublet', location: 'Gulshan', city: 'Dhaka', monthly_rent: 30000, status: 'Booked' },
    { _id: 'rented', title: 'Family house', accommodation_type: 'Rental house', location: 'Uttara', city: 'Dhaka', monthly_rent: 50000, status: 'Rented' },
  ]);
  getStoredUser.mockReturnValue({ id: 'mongo-owner', email: 'owner@example.com', role: 'owner', token: 'signed-token' });

  renderOwnerRoutes();

  expect(await screen.findByText('Sunny room')).toBeInTheDocument();
  const statGrid = screen.getByRole('region', { name: 'Property overview' });
  expect(within(within(statGrid).getByText('My properties').closest('article')).getByText('3')).toBeInTheDocument();
  expect(within(within(statGrid).getByText('Active listings').closest('article')).getByText('2')).toBeInTheDocument();
  expect(within(within(statGrid).getByText('Rented').closest('article')).getByText('1')).toBeInTheDocument();
  expect(screen.getByText('৳25,000 / month')).toBeInTheDocument();
});

test('redirects signed-in non-owners away from the owner workspace', async () => {
  mockMaybeSingle.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      user: {
        id: 'mongo-tenant',
        fullName: 'Mina Owner',
        email: 'owner@example.com',
        profileImage: null,
        role: 'tenant',
      },
    }),
  });
  getStoredUser.mockReturnValue({ id: 'mongo-tenant', email: 'owner@example.com', role: 'tenant', token: 'signed-token' });

  renderOwnerRoutes();

  expect(await screen.findByText('Tenant dashboard')).toBeInTheDocument();
});

test('posts a property and shows its saved listing details', async () => {
  getStoredUser.mockReturnValue({ id: 'mongo-owner', email: 'owner@example.com', role: 'owner', token: 'signed-token' });

  renderOwnerRoutes();

  expect(await screen.findByRole('heading', { name: /welcome home, mina/i })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('link', { name: /add a property/i })[0]);
  expect(await screen.findByRole('heading', { name: /add a property/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Sunny rental room' } });
  fireEvent.change(screen.getByLabelText(/accommodation type/i), { target: { value: 'Rental room' } });
  fireEvent.change(screen.getByLabelText(/monthly rent/i), { target: { value: '25000' } });
  fireEvent.change(screen.getByLabelText(/number of rooms/i), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: '12 Lake Road' } });
  fireEvent.change(screen.getByLabelText(/area \/ neighborhood/i), { target: { value: 'Dhanmondi' } });
  fireEvent.change(screen.getByLabelText(/^city/i), { target: { value: 'Dhaka' } });
  fireEvent.change(screen.getByLabelText(/facilities/i), { target: { value: 'Wi-Fi\nParking' } });
  fireEvent.click(screen.getByRole('button', { name: /post listing/i }));

  expect(await screen.findByText('LISTING SAVED')).toBeInTheDocument();
  expect(screen.getByText(/Sunny rental room/)).toBeInTheDocument();
  expect(screen.getByText('Rental room · ৳25,000 / month')).toBeInTheDocument();
  expect(screen.getByText('2 rooms · 1 bedrooms · 1 bathrooms')).toBeInTheDocument();
  expect(createProperty).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Sunny rental room',
    email: 'owner@example.com',
  }));
});
