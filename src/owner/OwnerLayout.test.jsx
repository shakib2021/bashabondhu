import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getStoredUser } from '../utils/authStorage';
import AddProperty from './AddProperty';
import OwnerDashboard from './OwnerDashboard';
import OwnerLayout from './OwnerLayout';

const mockMaybeSingle = jest.fn();

jest.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

jest.mock('../utils/authStorage', () => ({
  getStoredUser: jest.fn(),
}));

function renderOwnerRoutes() {
  return render(
    <MemoryRouter initialEntries={['/owner']}>
      <Routes>
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<OwnerDashboard />} />
          <Route path="properties/new" element={<AddProperty />} />
        </Route>
        <Route path="/tenant/dashboard" element={<p>Tenant dashboard</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockMaybeSingle.mockResolvedValue({
    data: {
      fullName: 'Mina Owner',
      email: 'owner@example.com',
      profileImage: null,
      role: 'owner',
    },
    error: null,
  });
});

test('shows the owner workspace to a signed-in owner', async () => {
  getStoredUser.mockReturnValue({ id: 'google-owner', email: 'owner@example.com', role: 'owner' });

  renderOwnerRoutes();

  expect(await screen.findByRole('heading', { name: /welcome home, mina/i })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: /owner navigation/i })).toBeInTheDocument();
});

test('redirects signed-in non-owners away from the owner workspace', async () => {
  getStoredUser.mockReturnValue({ id: 'google-owner', email: 'owner@example.com', role: 'tenant' });
  mockMaybeSingle.mockResolvedValue({
    data: {
      fullName: 'Mina Owner',
      email: 'owner@example.com',
      profileImage: null,
      role: 'tenant',
    },
    error: null,
  });

  renderOwnerRoutes();

  expect(await screen.findByText('Tenant dashboard')).toBeInTheDocument();
});

test('previews a valid property form without claiming to publish it', async () => {
  getStoredUser.mockReturnValue({ id: 'google-owner', email: 'owner@example.com', role: 'owner' });

  renderOwnerRoutes();

  expect(await screen.findByRole('heading', { name: /welcome home, mina/i })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('link', { name: /add a property/i })[0]);
  expect(await screen.findByRole('heading', { name: /add a property/i })).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/property name/i), { target: { value: 'Sunny apartment' } });
  fireEvent.change(screen.getByLabelText(/property type/i), { target: { value: 'apartment' } });
  fireEvent.change(screen.getByLabelText(/monthly rent/i), { target: { value: '25000' } });
  fireEvent.change(screen.getByLabelText(/street address/i), { target: { value: '12 Lake Road' } });
  fireEvent.change(screen.getByLabelText(/area \/ neighborhood/i), { target: { value: 'Dhanmondi' } });
  fireEvent.change(screen.getByLabelText(/^city/i), { target: { value: 'Dhaka' } });
  fireEvent.click(screen.getByRole('button', { name: /preview listing/i }));

  expect(await screen.findByText('This preview is not saved or published.')).toBeInTheDocument();
  expect(screen.getByText(/Sunny apartment/)).toBeInTheDocument();
});
