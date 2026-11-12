import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WatchlistButton from './WatchlistButton';
import { saveUserProfile } from '../../utils/authStorage';
import { setPropertyWatched } from '../../utils/watchlistApi';

vi.mock('../../utils/watchlistApi', () => ({
  setPropertyWatched: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  saveUserProfile(
    { id: 'mongo-user-id', email: 'home@example.com' },
    { fullName: 'Home User' },
    'tenant',
    'signed-token',
  );
});

test('saves a listing and reports the updated watchlist state', async () => {
  setPropertyWatched.mockResolvedValue(true);
  const onChange = vi.fn();
  render(<WatchlistButton propertyId="property-id" watched={false} onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Add to watchlist' }));

  await waitFor(() => expect(setPropertyWatched).toHaveBeenCalledWith('property-id', true));
  expect(onChange).toHaveBeenCalledWith(true);
});

test('asks signed-out users to log in instead of changing the watchlist', () => {
  localStorage.clear();
  const onSignInRequired = vi.fn();
  render(
    <WatchlistButton
      propertyId="property-id"
      watched={false}
      onChange={vi.fn()}
      onSignInRequired={onSignInRequired}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add to watchlist' }));

  expect(onSignInRequired).toHaveBeenCalledTimes(1);
  expect(setPropertyWatched).not.toHaveBeenCalled();
});
