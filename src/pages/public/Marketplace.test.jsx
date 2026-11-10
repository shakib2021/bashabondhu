import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Marketplace from './Marketplace';
import { getMarketplaceItems } from '../../utils/marketplaceApi';

jest.mock('../../utils/marketplaceApi', () => ({
  getMarketplaceItems: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  getMarketplaceItems.mockResolvedValue([{
    _id: 'chair-id',
    title: 'Study chair',
    price: 1800,
    condition: 'Good',
    location: 'Uttara, Dhaka',
    images: [],
  }]);
});

test('browses public listings and searches by item name', async () => {
  render(
    <MemoryRouter>
      <Marketplace />
    </MemoryRouter>,
  );

  expect(await screen.findByRole('link', { name: /Study chair/ })).toHaveAttribute(
    'href',
    '/marketplace/items/chair-id',
  );
  expect(screen.getByText('৳1,800')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search items by name or location' }), {
    target: { value: 'lamp' },
  });
  fireEvent.submit(screen.getByLabelText('Search items by name or location').closest('form'));

  await waitFor(() => expect(getMarketplaceItems).toHaveBeenLastCalledWith('lamp'));
});
