import { useState } from 'react';
import { Heart } from 'lucide-react';
import { getStoredUser } from '../../utils/authStorage';
import { setPropertyWatched } from '../../utils/watchlistApi';

function WatchlistButton({
  propertyId,
  watched,
  onChange,
  onSignInRequired,
  showRemoveLabel = false,
  disabled = false,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!getStoredUser()?.token) {
      onSignInRequired?.();
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const updatedValue = await setPropertyWatched(propertyId, !watched);
      onChange(updatedValue);
    } catch (error) {
      setErrorMessage(error.message || 'Could not update your watchlist.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <span className={`watchlist-control${showRemoveLabel ? ' watchlist-control-labeled' : ''}`}>
      <button
        className={`save-home${watched ? ' is-saved' : ''}`}
        type="button"
        aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-pressed={watched}
        disabled={disabled || isSaving}
        onClick={handleClick}
      >
        <Heart aria-hidden="true" className={watched ? 'is-filled' : ''} />
        {showRemoveLabel && <span>{watched ? 'Remove' : 'Save'}</span>}
      </button>
      {errorMessage && <span className="watchlist-control-error" role="alert">{errorMessage}</span>}
    </span>
  );
}

export default WatchlistButton;
