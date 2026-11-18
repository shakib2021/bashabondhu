import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { getOwnerVisitRequests, updateVisitRequest } from '../utils/visitRequestApi';
import VisitRequests from './VisitRequests';

vi.mock('../utils/visitRequestApi', () => ({
  getOwnerVisitRequests: vi.fn(),
  updateVisitRequest: vi.fn(),
}));

beforeEach(() => {
  getOwnerVisitRequests.mockResolvedValue([{
    _id: 'request-1',
    status: 'pending',
    requesterName: 'Tenant One',
    requesterEmail: 'tenant@example.com',
    visitAt: '2027-01-15T10:30:00.000Z',
    createdAt: '2026-11-18T10:00:00.000Z',
    property: {
      _id: 'property-1',
      title: 'Sunny apartment',
      city: 'Dhaka',
      location: 'Gulshan',
    },
  }]);
  updateVisitRequest.mockResolvedValue({ _id: 'request-1', status: 'accepted' });
});

test('shows the requested visit time and lets the owner accept it', async () => {
  render(
    <MemoryRouter>
      <VisitRequests />
    </MemoryRouter>,
  );

  const requestedVisitTime = await screen.findByText(/Requested for/);
  expect(requestedVisitTime).toHaveAttribute('datetime', '2027-01-15T10:30:00.000Z');
  fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

  await waitFor(() => {
    expect(updateVisitRequest).toHaveBeenCalledWith('request-1', 'accepted');
    expect(screen.getByText('accepted')).toBeInTheDocument();
  });
});
