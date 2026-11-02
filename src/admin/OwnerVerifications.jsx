import { useEffect, useState } from 'react';
import {
  getAdminOwnerVerifications,
  getOwnerVerificationDocument,
  reviewOwnerVerification,
} from '../utils/ownerVerificationApi';
import './OwnerVerifications.css';

function VerificationCard({ verification, onReviewed }) {
  const [images, setImages] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let frontUrl;
    let backUrl;
    Promise.all([
      getOwnerVerificationDocument(verification.id, 'front'),
      getOwnerVerificationDocument(verification.id, 'back'),
    ]).then(([front, back]) => {
      frontUrl = URL.createObjectURL(front);
      backUrl = URL.createObjectURL(back);
      if (isMounted) {
        setImages({ frontUrl, backUrl });
      } else {
        URL.revokeObjectURL(frontUrl);
        URL.revokeObjectURL(backUrl);
      }
    }).catch((error) => {
      if (isMounted) setErrorMessage(error.message || 'Could not load NID images.');
    });

    return () => {
      isMounted = false;
      if (frontUrl) URL.revokeObjectURL(frontUrl);
      if (backUrl) URL.revokeObjectURL(backUrl);
    };
  }, [verification.id]);

  const handleReview = async (decision) => {
    setErrorMessage('');
    setIsReviewing(true);
    try {
      await reviewOwnerVerification(verification.id, decision, rejectionReason);
      onReviewed(verification.id);
    } catch (error) {
      setErrorMessage(error.message || 'Could not update this verification request.');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <article className="admin-verification-card">
      <header className="admin-verification-heading">
        <div>
          <h2>{verification.owner.fullName || 'Owner'}</h2>
          <p>{verification.owner.email}</p>
        </div>
        <span>Submitted {new Date(verification.submittedAt).toLocaleDateString()}</span>
      </header>
      <dl className="admin-verification-details">
        <div><dt>Name on NID</dt><dd>{verification.nidName}</dd></div>
        <div><dt>NID number</dt><dd>{verification.nidNumber}</dd></div>
      </dl>
      {images ? (
        <div className="admin-verification-images">
          <figure><img src={images.frontUrl} alt="Front of submitted NID" /><figcaption>Front side</figcaption></figure>
          <figure><img src={images.backUrl} alt="Back of submitted NID" /><figcaption>Back side</figcaption></figure>
        </div>
      ) : (
        <p className={errorMessage ? 'admin-verification-error' : ''} role={errorMessage ? 'alert' : 'status'}>
          {errorMessage || 'Loading private NID images…'}
        </p>
      )}
      <label className="admin-verification-rejection">
        Rejection reason (required to reject)
        <textarea
          value={rejectionReason}
          maxLength="500"
          rows="2"
          onChange={(event) => setRejectionReason(event.target.value)}
        />
      </label>
      {errorMessage && images && <p className="admin-verification-error" role="alert">{errorMessage}</p>}
      <div className="admin-verification-actions">
        <button type="button" disabled={isReviewing || !images} onClick={() => handleReview('approve')}>
          {isReviewing ? 'Saving…' : 'Approve verification'}
        </button>
        <button
          type="button"
          className="is-reject"
          disabled={isReviewing || !images || !rejectionReason.trim()}
          onClick={() => handleReview('reject')}
        >
          Reject
        </button>
      </div>
    </article>
  );
}

function OwnerVerifications() {
  const [verifications, setVerifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAdminOwnerVerifications()
      .then((result) => {
        if (isMounted) setVerifications(result);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message || 'Could not load verification requests.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="admin-verifications-page">
      <span className="admin-verifications-eyebrow">ADMIN REVIEW</span>
      <h1>Owner verifications</h1>
      <p className="admin-verifications-intro">Review both sides of each NID before approving the verified owner badge.</p>
      {isLoading && <p role="status">Loading verification requests…</p>}
      {errorMessage && <p className="admin-verification-error" role="alert">{errorMessage}</p>}
      {!isLoading && !errorMessage && verifications.length === 0 && (
        <section className="admin-verifications-empty">There are no owner verifications waiting for review.</section>
      )}
      <div className="admin-verification-list">
        {verifications.map((verification) => (
          <VerificationCard
            key={verification.id}
            verification={verification}
            onReviewed={(id) => setVerifications((items) => items.filter((item) => item.id !== id))}
          />
        ))}
      </div>
    </main>
  );
}

export default OwnerVerifications;
