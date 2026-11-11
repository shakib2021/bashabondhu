import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Marketplace from './Marketplace';
import { getMarketplaceItems } from '../../utils/marketplaceApi';

jest.mock('embla-carousel-react', () => ({
  __esModule: true,
  ...(() => {
    const api = {
      selectedScrollSnap: jest.fn(() => 0),
      on: jest.fn(),
      off: jest.fn(),
      reInit: jest.fn(),
      scrollNext: jest.fn(),
      scrollPrev: jest.fn(),
      scrollTo: jest.fn(),
    };
    return { mockApi: api, default: () => [jest.fn(), api] };
  })(),
}));
jest.mock('../../utils/marketplaceApi', () => ({
  getMarketplaceItems: jest.fn(),
}));

const mockEmblaApi = jest.requireMock('embla-carousel-react').mockApi;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  getMarketplaceItems.mockResolvedValue([
    {
      _id: 'chair-id',
      title: 'Study chair',
      price: 1800,
      condition: 'Good',
      location: 'Uttara, Dhaka',
      images: [],
    },
    {
      _id: 'table-id',
      title: 'Dining table',
      price: 6500,
      condition: 'Like new',
      location: 'Mirpur, Dhaka',
      images: [],
    },
    {
      _id: 'lamp-id',
      title: 'Desk lamp',
      price: 900,
      condition: 'Fair',
      location: 'Dhanmondi, Dhaka',
      images: [],
    },
  ]);
});

afterEach(() => {
  jest.useRealTimers();
});

test('automatically advances marketplace posts and can be paused', async () => {
  jest.useFakeTimers();

  render(
    <MemoryRouter>
      <Marketplace />
    </MemoryRouter>,
  );

  await screen.findByRole('group', { name: '1 of 3' });
  act(() => jest.advanceTimersByTime(2000));
  expect(mockEmblaApi.scrollNext).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Pause automatic marketplace slides' }));
  act(() => jest.advanceTimersByTime(10000));
  expect(mockEmblaApi.scrollNext).toHaveBeenCalledTimes(1);
});

test('browses public listings and searches by item name', async () => {
  render(
    <MemoryRouter>
      <Marketplace />
    </MemoryRouter>,
  );

  const carousel = await screen.findByRole('region', { name: 'Marketplace listings' });
  expect(within(carousel).getByRole('link', { name: 'View Study chair listing' })).toHaveAttribute(
    'href',
    '/marketplace/items/chair-id',
  );
  expect(within(carousel).getByText('৳1,800')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search items by name or location' }), {
    target: { value: 'lamp' },
  });
  fireEvent.submit(screen.getByLabelText('Search items by name or location').closest('form'));

  await waitFor(() => expect(getMarketplaceItems).toHaveBeenLastCalledWith('lamp'));
});

test('shows actual marketplace posts in the carousel with controls', async () => {
  render(
    <MemoryRouter>
      <Marketplace />
    </MemoryRouter>,
  );

  const carousel = await screen.findByRole('region', { name: 'Marketplace listings' });
  expect(carousel).toHaveAttribute(
    'aria-roledescription',
    'carousel',
  );
  const firstPost = within(carousel).getByRole('group', { name: '1 of 3' });
  expect(firstPost).toHaveTextContent('Study chair');
  expect(firstPost).toHaveTextContent('৳1,800');
  expect(within(firstPost).getByRole('link', { name: 'View Study chair listing' })).toHaveAttribute(
    'href',
    '/marketplace/items/chair-id',
  );
  expect(within(carousel).getByRole('button', { name: 'Previous marketplace listing' })).toBeInTheDocument();
  expect(within(carousel).getByRole('button', { name: 'Next marketplace listing' })).toBeInTheDocument();
  expect(within(carousel).getByRole('button', { name: 'Show marketplace listing 2' })).toBeInTheDocument();
});

test('filters listings by area and can return to all areas', async () => {
  render(
    <MemoryRouter>
      <Marketplace />
    </MemoryRouter>,
  );

  await waitFor(() => expect(document.querySelectorAll('.marketplace-card')).toHaveLength(3));
  const filters = screen.getByRole('group', { name: 'Search by area' });

  fireEvent.click(within(filters).getByRole('button', { name: 'Dhanmondi' }));

  expect(document.querySelectorAll('.marketplace-card')).toHaveLength(1);
  expect(document.querySelector('.marketplace-grid')).toHaveTextContent('Desk lamp');
  expect(document.querySelector('.marketplace-grid')).not.toHaveTextContent('Study chair');
  expect(within(filters).getByRole('button', { name: 'Dhanmondi' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(within(filters).getByRole('button', { name: 'All areas' }));
  expect(document.querySelectorAll('.marketplace-card')).toHaveLength(3);
});

test('shows an area-specific empty state when an area has no listings', async () => {
  render(
    <MemoryRouter>
      <Marketplace />
    </MemoryRouter>,
  );

  await waitFor(() => expect(document.querySelectorAll('.marketplace-card')).toHaveLength(3));
  fireEvent.click(screen.getByRole('button', { name: 'Mohammadpur' }));

  expect(await screen.findByText(/There are no items in Mohammadpur yet/)).toBeInTheDocument();
});
