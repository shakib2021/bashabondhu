import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WatchlistButton from './WatchlistButton';
import { saveUserProfile } from '../../utils/authStorage';
import { setPropertyWatched } from '../../utils/watchlistApi';

jest.mock('../../utils/watchlistApi', () => ({
  setPropertyWatched: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  saveUserProfile(
    { id: 'mongo-user-id', email: 'home@example.com' },
    { fullName: 'Home User' },
    'tenant',
    'signed-token',
  );
});

test('saves a listing and reports the updated watchlist state', async () => {
  setPropertyWatched.mockResolvedValue(true);
  const onChange = jest.fn();
  render(<WatchlistButton propertyId="property-id" watched={false} onChange={onChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Add to watchlist' }));

  await waitFor(() => expect(setPropertyWatched).toHaveBeenCalledWith('property-id', true));
  expect(onChange).toHaveBeenCalledWith(true);
});

test('asks signed-out users to log in instead of changing the watchlist', () => {
  localStorage.clear();
  const onSignInRequired = jest.fn();
  render(
    <WatchlistButton
      propertyId="property-id"
      watched={false}
      onChange={jest.fn()}
      onSignInRequired={onSignInRequired}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add to watchlist' }));

  expect(onSignInRequired).toHaveBeenCalledTimes(1);
  expect(setPropertyWatched).not.toHaveBeenCalled();
});
