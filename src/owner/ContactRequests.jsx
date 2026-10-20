import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOwnerContactRequests, updateContactRequest } from '../utils/contactRequestApi';

function ContactRequests() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');
    getOwnerContactRequests()
      .then((items) => {
        if (isMounted) {
          setRequests(items);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load contact requests.');
          setStatus('error');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleDecision = async (requestId, decision) => {
    setUpdatingId(requestId);
    setErrorMessage('');
    try {
      const updated = await updateContactRequest(requestId, decision);
      setRequests((current) => current.map((request) => (
        request._id === requestId ? { ...request, status: updated.status } : request
      )));
    } catch (error) {
      setErrorMessage(error.message || 'Could not update this request.');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  return (
    <>
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">INQUIRIES</span>
          <h1>Contact requests</h1>
          <p>Review people who want to hear from you about a listing.</p>
        </div>
        {status === 'ready' && <span className="owner-count">{pendingCount} pending</span>}
      </section>

      {errorMessage && <p className="owner-request-error" role="alert">{errorMessage}</p>}
      {status === 'loading' && <p className="owner-dashboard-state" role="status">Loading contact requests…</p>}
      {status === 'error' && (
        <div className="owner-dashboard-state">
          <button className="owner-button owner-button-outline" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      )}
      {status === 'ready' && requests.length === 0 && (
        <section className="owner-panel owner-requests-empty">
          <span className="owner-eyebrow">NO REQUESTS YET</span>
          <h2>When tenants reach out, you’ll see them here.</h2>
          <p>Every request is shown with the listing it came from.</p>
        </section>
      )}
      {status === 'ready' && requests.length > 0 && (
        <section className="owner-panel owner-request-list" aria-label="Contact requests">
          {requests.map((request) => (
            <article className="owner-request-item" key={request._id}>
              <div className="owner-request-person">
                <strong>{request.requesterName}</strong>
                <a href={`mailto:${request.requesterEmail}`}>{request.requesterEmail}</a>
                <time dateTime={request.createdAt}>Requested {new Date(request.createdAt).toLocaleString()}</time>
              </div>
              <div className="owner-request-property">
                <span className="owner-eyebrow">REQUEST FROM LISTING</span>
                <Link to={`/properties/${request.property._id}`}>{request.property.title}</Link>
                <span>{request.property.location}, {request.property.city}</span>
              </div>
              <div className="owner-request-actions">
                <span className={`owner-listing-status owner-listing-status-${request.status}`}>
                  {request.status}
                </span>
                {request.status === 'pending' && (
                  <>
                    <button
                      className="owner-button owner-button-primary"
                      type="button"
                      disabled={updatingId === request._id}
                      onClick={() => handleDecision(request._id, 'accepted')}
                    >
                      {updatingId === request._id ? 'Updating…' : 'Accept'}
                    </button>
                    <button
                      className="owner-button owner-button-outline"
                      type="button"
                      disabled={updatingId === request._id}
                      onClick={() => handleDecision(request._id, 'rejected')}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

export default ContactRequests;