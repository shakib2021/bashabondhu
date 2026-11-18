import { vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { saveUserProfile } from '../../utils/authStorage';
import { getPublicProperties } from '../../utils/propertyApi';
import { getMarketplaceItems } from '../../utils/marketplaceApi';
import { reportProperty } from '../../utils/propertyReportApi';
import { getMyWatchlist, setPropertyWatched } from '../../utils/watchlistApi';

const { mockEmblaApi } = vi.hoisted(() => {
  const api = {
    selectedScrollSnap: vi.fn(() => 0),
    on: vi.fn(),
    off: vi.fn(),
    scrollNext: vi.fn(),
    scrollPrev: vi.fn(),
    scrollTo: vi.fn(),
  };

  return { mockEmblaApi: api };
});

vi.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: () => [vi.fn(), mockEmblaApi],
}));

vi.mock('../../utils/propertyApi', () => ({
  getPublicProperties: vi.fn(),
}));

vi.mock('../../utils/marketplaceApi', () => ({
  getMarketplaceItems: vi.fn(),
}));

vi.mock('../../utils/propertyReportApi', () => ({
  reportProperty: vi.fn(),
}));

vi.mock('../../utils/watchlistApi', () => ({
  getMyWatchlist: vi.fn(),
  setPropertyWatched: vi.fn(),
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
  vi.clearAllMocks();
  saveUserProfile(
    { id: 'mongo-user-id', email: 'home@example.com' },
    { fullName: 'Home User' },
    'tenant',
    'signed-token',
  );
  getPublicProperties.mockResolvedValue([property]);
  getMarketplaceItems.mockResolvedValue([]);
  getMyWatchlist.mockResolvedValue([]);
  setPropertyWatched.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

test('automatically advances featured homes and can be paused', { timeout: 8000 }, async () => {
  getPublicProperties.mockResolvedValue([{ ...property }, { ...property, _id: 'second-property-id' }]);

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  await screen.findByRole('group', { name: '1 of 2' });
  await waitFor(() => expect(mockEmblaApi.scrollNext).toHaveBeenCalledTimes(1), { timeout: 4000 });

  fireEvent.click(screen.getByRole('button', { name: 'Pause automatic featured home slides' }));
  await new Promise((resolve) => setTimeout(resolve, 2500));
  expect(mockEmblaApi.scrollNext).toHaveBeenCalledTimes(1);
});

test('shows recent buy and sell posts on the home page', async () => {
  getMarketplaceItems.mockResolvedValue([{
    _id: 'chair-id',
    title: 'Study chair',
    price: 1800,
    condition: 'Good',
    location: 'Uttara, Dhaka',
    images: ['https://example.com/chair.jpg'],
  }]);

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'A new home for good things.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View Study chair, ৳1,800' })).toHaveAttribute(
    'href',
    '/marketplace/items/chair-id',
  );
  expect(screen.getByRole('link', { name: 'Explore Buy & Sell' })).toHaveAttribute('href', '/marketplace');
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

  expect(screen.getAllByRole('status')).toHaveLength(3);
  expect(screen.getAllByText('Finding your next place')).toHaveLength(2);
  expect(screen.getByText('Finding nearby items…')).toBeInTheDocument();
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
