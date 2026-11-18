import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { getStoredUser } from '../../utils/authStorage';
import { getMyContactRequest, getPublicProperty } from '../../utils/propertyApi';
import { createVisitRequest, getMyVisitRequest } from '../../utils/visitRequestApi';
import PropertyDetails from './PropertyDetails';

vi.mock('../../components/common/Navbar', () => ({ default: () => null }));
vi.mock('../../components/common/Footer', () => ({ default: () => null }));
vi.mock('../../utils/authStorage', () => ({ getStoredUser: vi.fn() }));
vi.mock('../../utils/propertyApi', () => ({
  createPropertyComment: vi.fn(),
  createPropertyCommentReply: vi.fn(),
  getMyContactRequest: vi.fn(),
  getOwnerContactDetails: vi.fn(),
  getPublicProperty: vi.fn(),
}));
vi.mock('../../utils/visitRequestApi', () => ({
  createVisitRequest: vi.fn(),
  getMyVisitRequest: vi.fn(),
}));

beforeEach(() => {
  getStoredUser.mockReturnValue({ token: 'tenant-token', role: 'tenant' });
  getMyContactRequest.mockResolvedValue(null);
  getMyVisitRequest.mockResolvedValue(null);
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
  createVisitRequest.mockResolvedValue({
    _id: 'visit-request-1',
    status: 'pending',
    visitAt: '2030-01-02T12:30:00.000Z',
  });
});

test('lets a tenant submit a requested property visit date and time', async () => {
  render(
    <MemoryRouter initialEntries={['/properties/property-1']}>
      <Routes>
        <Route path="/properties/:propertyId" element={<PropertyDetails />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByRole('heading', { name: 'Sunny apartment' });
  fireEvent.change(screen.getByLabelText('Requested date and time'), {
    target: { value: '2030-01-02T12:30' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Request visit' }));

  await waitFor(() => {
    expect(createVisitRequest).toHaveBeenCalledWith(
      'property-1',
      new Date('2030-01-02T12:30').toISOString(),
    );
    expect(screen.getByText('Visit pending')).toBeInTheDocument();
  });
});
