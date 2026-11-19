import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { getStoredUser } from '../../utils/authStorage';
import { startChat } from '../../utils/chatApi';
import { getPublicProperty } from '../../utils/propertyApi';
import PropertyDetails from './PropertyDetails';

vi.mock('../../components/common/Navbar', () => ({ default: () => null }));
vi.mock('../../components/common/Footer', () => ({ default: () => null }));
vi.mock('../../utils/authStorage', () => ({ getStoredUser: vi.fn() }));
vi.mock('../../utils/propertyApi', () => ({
  createPropertyComment: vi.fn(),
  createPropertyCommentReply: vi.fn(),
  getPublicProperty: vi.fn(),
}));
vi.mock('../../utils/chatApi', () => ({
  startChat: vi.fn(),
}));

beforeEach(() => {
  getStoredUser.mockReturnValue({ token: 'tenant-token', role: 'tenant' });
  getPublicProperty.mockResolvedValue({
    _id: 'property-1',
    title: 'Sunny apartment',
    description: 'A bright place to call home.',
    accommodation_type: 'Apartment',
    city: 'Dhaka',
    location: 'Gulshan',
    monthly_rent: 25000,
    number_of_rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    facilities: [],
    images: [],
    gender: 'any',
    status: 'Available',
    rating: 0,
    comments: [],
    owner: { fullName: 'Property Owner' },
  });
});

test('lets a tenant start a private chat with a property owner', async () => {
  startChat.mockResolvedValue({ id: 'conversation-1' });
  render(
    <MemoryRouter initialEntries={['/properties/property-1']}>
      <Routes>
        <Route path="/properties/:propertyId" element={<PropertyDetails />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByRole('heading', { name: 'Sunny apartment' });
  expect(screen.queryByLabelText('Requested date and time')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Request contact' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your message to Property Owner'), {
    target: { value: 'Is the home available next month?' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => {
    expect(startChat).toHaveBeenCalledWith(
      'property',
      'property-1',
      'Is the home available next month?',
    );
  });
});
