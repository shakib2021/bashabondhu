import { useState } from 'react';
import { getStoredUser } from '../../utils/authStorage';
import { reportProperty } from '../../utils/propertyReportApi';

const REPORT_REASONS = [
  ['scam', 'Scam or fraud'],
  ['sexual-content', 'Sexual content'],
  ['violence', 'Violence or harmful content'],
  ['discrimination', 'Discrimination or hate'],
  ['misleading-information', 'Misleading information'],
  ['unsafe-property', 'Unsafe or prohibited property'],
  ['duplicate-listing', 'Duplicate listing'],
  ['other', 'Other'],
];

function ReportListingButton({ propertyId, propertyTitle, onSignInRequired }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const openReportForm = () => {
    setIsMenuOpen(false);
    if (!getStoredUser()?.token) {
      onSignInRequired?.();
      return;
    }
    setIsFormOpen(true);
    setStatus('idle');
    setErrorMessage('');
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!category) {
      setErrorMessage('Choose a reason for your report.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');
    try {
      await reportProperty(propertyId, { category, details });
      setStatus('submitted');
    } catch (error) {
      setStatus('idle');
      setErrorMessage(error.message || 'Could not submit your report.');
    }
  };

  return (
    <div className="listing-report-control">
      <button
        className="listing-more-button"
        type="button"
        aria-label={`More options for ${propertyTitle}`}
        aria-expanded={isMenuOpen}
        onClick={() => {
          setIsMenuOpen((open) => !open);
          setIsFormOpen(false);
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {isMenuOpen && (
        <div className="listing-more-menu">
          <button type="button" onClick={openReportForm}>Report listing</button>
        </div>
      )}
      {isFormOpen && (
        <div
          className="listing-report-dialog"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`report-title-${propertyId}`}
        >
          <div className="listing-report-heading">
            <strong id={`report-title-${propertyId}`}>Report this listing</strong>
            <button type="button" aria-label="Close report form" onClick={() => setIsFormOpen(false)}>×</button>
          </div>
          {status === 'submitted' ? (
            <div className="listing-report-success" role="status">
              <p>Thank you. Your report has been sent for review.</p>
              <button type="button" onClick={() => setIsFormOpen(false)}>Done</button>
            </div>
          ) : (
            <form onSubmit={submitReport}>
              <label className="listing-report-field">
                <span>Why are you reporting this?</span>
                <select
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={status === 'submitting'}
                >
                  <option value="">Select a reason</option>
                  {REPORT_REASONS.map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="listing-report-field">
                <span>Additional details <small>(optional)</small></span>
                <textarea
                  rows="3"
                  maxLength="1000"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Share anything that may help us review this listing."
                  disabled={status === 'submitting'}
                />
              </label>
              {errorMessage && <p className="listing-report-error" role="alert">{errorMessage}</p>}
              <div className="listing-report-actions">
                <button type="button" disabled={status === 'submitting'} onClick={() => setIsFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending…' : 'Submit report'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportListingButton;
