import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getOwnerVerification, submitOwnerVerification } from '../utils/ownerVerificationApi';

function OwnerProfile() {
  const { profile } = useOutletContext();
  const [verification, setVerification] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields = [
    ['Full name', profile.fullName],
    ['Email address', profile.email],
    ['Phone', profile.phone || 'Not provided'],
    ['Occupation', profile.occupation || 'Not provided'],
    ['Address', profile.address || 'Not provided'],
  ];

  useEffect(() => {
    let isMounted = true;
    getOwnerVerification()
      .then((result) => {
        if (isMounted) setVerification(result);
      })
      .catch((error) => {
        if (isMounted) setVerificationError(error.message || 'Could not load verification status.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingVerification(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerificationSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setVerificationError('');
    setIsSubmitting(true);
    try {
      const result = await submitOwnerVerification({
        nidName: formData.get('nidName'),
        nidNumber: formData.get('nidNumber'),
        frontImage: formData.get('frontImage'),
        backImage: formData.get('backImage'),
      });
      setVerification(result);
      form.reset();
    } catch (error) {
      setVerificationError(error.message || 'Could not submit your NID for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVerified = profile.isVerified || verification?.status === 'approved';

  return (
    <>
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">ACCOUNT</span>
          <h1>My profile</h1>
          <p>Your personal details connected to BashaBondhu.</p>
        </div>
      </section>
      <section className="owner-panel owner-profile-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">PERSONAL INFORMATION</span>
            <h2>Profile details</h2>
          </div>
          {isVerified && <span className="owner-profile-verification is-verified">Verified owner</span>}
        </div>
        <div className="owner-profile-fields">
          {fields.map(([label, value]) => (
            <div className="owner-profile-field" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="owner-panel owner-verification-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">OWNER VERIFICATION</span>
            <h2>Verify your identity</h2>
          </div>
        </div>
        <div className="owner-verification-content">
          {isLoadingVerification ? (
            <p aria-live="polite">Loading verification status…</p>
          ) : isVerified ? (
            <p className="owner-verification-message is-success" role="status">
              Your identity has been verified. The verified owner badge is shown on your listings.
            </p>
          ) : verification?.status === 'pending' ? (
            <p className="owner-verification-message" role="status">
              Your NID is being reviewed. Your listings will show a verified badge only after approval.
            </p>
          ) : (
            <>
              {verification?.status === 'rejected' && (
                <p className="owner-verification-message is-error" role="status">
                  Your last submission was not approved{verification.rejectionReason ? `: ${verification.rejectionReason}` : '.'}
                  {' '}You can submit a new one below.
                </p>
              )}
              <p className="owner-verification-intro">
                Enter the details printed on your Bangladesh NID and upload clear images of both sides.
                Only our admins can access these documents.
              </p>
              <form className="owner-verification-form" onSubmit={handleVerificationSubmit}>
                <label>
                  Name printed on NID
                  <input name="nidName" type="text" maxLength="255" autoComplete="name" required />
                </label>
                <label>
                  NID number
                  <input
                    name="nidNumber"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9 -]{10,22}"
                    maxLength="22"
                    aria-describedby="nid-number-help"
                    required
                  />
                  <small id="nid-number-help">Use your 10, 13, or 17 digit number.</small>
                </label>
                <label>
                  NID front side
                  <input name="frontImage" type="file" accept="image/jpeg,image/png,image/webp" required />
                  <small>JPEG, PNG, or WebP; up to 4 MB.</small>
                </label>
                <label>
                  NID back side
                  <input name="backImage" type="file" accept="image/jpeg,image/png,image/webp" required />
                  <small>JPEG, PNG, or WebP; up to 4 MB.</small>
                </label>
                {verificationError && <p className="owner-verification-message is-error" role="alert">{verificationError}</p>}
                <button className="owner-button owner-button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit for review'}
                </button>
              </form>
            </>
          )}
          {verificationError && isLoadingVerification && (
            <p className="owner-verification-message is-error" role="alert">{verificationError}</p>
          )}
        </div>
      </section>
    </>
  );
}

export default OwnerProfile;