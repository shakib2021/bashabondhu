import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { saveUserProfile } from '../../utils/authStorage';
import { getPublicProperties } from '../../utils/propertyApi';
import { reportProperty } from '../../utils/propertyReportApi';
import { getMyWatchlist, setPropertyWatched } from '../../utils/watchlistApi';

jest.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: () => [jest.fn(), null],
}));
jest.mock('../../utils/propertyApi', () => ({
  getPublicProperties: jest.fn(),
}));
jest.mock('../../utils/propertyReportApi', () => ({
  reportProperty: jest.fn(),
}));
jest.mock('../../utils/watchlistApi', () => ({
  getMyWatchlist: jest.fn(),
  setPropertyWatched: jest.fn(),
}));

const property = {
  _id: 'property-id',
  title: 'Sunny home',
  location: 'Dhanmondi',
  city: 'Dhaka',
  monthly_rent: 25000,
  bedrooms: 2,
  bathrooms: 1,
  number_of_rooms: 3,
  status: 'Available',
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  saveUserProfile(
    { id: 'mongo-user-id', email: 'home@example.com' },
    { fullName: 'Home User' },
    'tenant',
    'signed-token',
  );
  getPublicProperties.mockResolvedValue([property]);
  getMyWatchlist.mockResolvedValue([]);
  setPropertyWatched.mockResolvedValue(true);
});

test('shows report and watchlist actions on home listing cards', async () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  const addToWatchlist = await screen.findByRole('button', { name: 'Add to watchlist' });
  await waitFor(() => expect(addToWatchlist).toBeEnabled());
  fireEvent.click(addToWatchlist);
  await waitFor(() => expect(setPropertyWatched).toHaveBeenCalledWith('property-id', true));

  fireEvent.click(screen.getByRole('button', { name: 'More options for Sunny home' }));
  fireEvent.click(screen.getByRole('button', { name: 'Report listing' }));
  fireEvent.change(screen.getByLabelText('Why are you reporting this?'), { target: { value: 'scam' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

  await waitFor(() => {
    expect(reportProperty).toHaveBeenCalledWith('property-id', { category: 'scam', details: '' });
  });
  expect(await screen.findByText('Thank you. Your report has been sent for review.')).toBeInTheDocument();
});

test('shows the themed loader while home listings are loading', () => {
  getPublicProperties.mockReturnValue(new Promise(() => {}));

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  expect(screen.getAllByRole('status')).toHaveLength(2);
  expect(screen.getAllByText('Finding your next place')).toHaveLength(2);
});

test('shows the post status in the listing card content, outside the image', async () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  const status = await screen.findByText('Available');

  expect(status).toHaveClass('home-status', 'home-status-available');
  expect(status.closest('.home-card-copy')).not.toBeNull();
  expect(status.closest('.home-card-art')).toBeNull();
});

test('shows rented listings on the home page with their rented status', async () => {
  getPublicProperties.mockResolvedValueOnce([{ ...property, status: 'Rented' }]);

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  const status = await screen.findByText('Rented');
  expect(status).toHaveClass('home-status-rented');
  expect(status.closest('.home-card-copy')).not.toBeNull();
});
