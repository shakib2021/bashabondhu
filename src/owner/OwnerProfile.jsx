import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ProfileIdentityCard from '../components/common/ProfileIdentityCard';
import ProfileDetailsGrid from '../components/common/ProfileDetailsGrid';
import { getOwnerVerification, submitOwnerVerification } from '../utils/ownerVerificationApi';
import { updateUserInfo } from '../utils/userApi';

function OwnerProfile() {
  const { profile, onProfileUpdate } = useOutletContext();
  const [verification, setVerification] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    occupation: profile.occupation || '',
    address: profile.address || '',
    profileImage: profile.profileImage || '',
  });
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

  const beginEditing = () => {
    setFormValues({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      occupation: profile.occupation || '',
      address: profile.address || '',
      profileImage: profile.profileImage || '',
    });
    setProfileMessage('');
    setProfileError(false);
    setIsEditing(true);
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }));
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setProfileMessage('');
    setProfileError(false);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage('');
    setProfileError(false);

    try {
      const fullName = formValues.fullName.trim();
      if (!fullName) {
        throw new Error('Enter your full name.');
      }

      const profileImage = formValues.profileImage.trim();
      if (profileImage) {
        let imageUrl;
        try {
          imageUrl = new URL(profileImage);
        } catch {
          throw new Error('Enter a valid profile image URL.');
        }
        if (!['https:', 'http:'].includes(imageUrl.protocol)) {
          throw new Error('Profile image URLs must use HTTP or HTTPS.');
        }
      }

      const updatedProfile = await updateUserInfo({
        fullName,
        phone: formValues.phone.trim() || null,
        occupation: formValues.occupation.trim() || null,
        address: formValues.address.trim() || null,
        profileImage: profileImage || null,
      });
      setFormValues({
        fullName: updatedProfile.fullName || '',
        phone: updatedProfile.phone || '',
        occupation: updatedProfile.occupation || '',
        address: updatedProfile.address || '',
        profileImage: updatedProfile.profileImage || '',
      });
      onProfileUpdate(updatedProfile);
      setIsEditing(false);
      setProfileMessage('Your profile has been updated.');
    } catch (error) {
      setProfileMessage(error.message || 'Could not update your profile.');
      setProfileError(true);
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      <ProfileIdentityCard
        profile={profile}
        roleLabel="Owner"
        statusLabel={isVerified ? 'Verified owner' : ''}
      />
      <section className="owner-panel owner-profile-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">PERSONAL INFORMATION</span>
            <h2>Profile details</h2>
          </div>
          <div className="owner-profile-heading-actions">
            {isVerified && <span className="owner-profile-verification is-verified">Verified owner</span>}
            {!isEditing && (
              <button className="owner-button owner-button-outline" type="button" onClick={beginEditing}>
                Edit profile
              </button>
            )}
          </div>
        </div>
        {isEditing ? (
          <form className="owner-profile-form" onSubmit={handleProfileSubmit}>
            <div className="owner-profile-fields">
              <label className="owner-profile-field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  name="fullName"
                  required
                  maxLength={255}
                  value={formValues.fullName}
                  onChange={handleProfileChange}
                />
              </label>
              <label className="owner-profile-field">
                <span>Email address</span>
                <input value={profile.email} readOnly />
                <small>Email is managed by your sign-in provider.</small>
              </label>
              <label className="owner-profile-field">
                <span>Phone</span>
                <input
                  autoComplete="tel"
                  name="phone"
                  type="tel"
                  maxLength={30}
                  value={formValues.phone}
                  onChange={handleProfileChange}
                />
              </label>
              <label className="owner-profile-field">
                <span>Occupation</span>
                <input
                  autoComplete="organization-title"
                  name="occupation"
                  maxLength={150}
                  value={formValues.occupation}
                  onChange={handleProfileChange}
                />
              </label>
              <label className="owner-profile-field owner-profile-field-wide">
                <span>Address</span>
                <textarea
                  autoComplete="street-address"
                  name="address"
                  rows="3"
                  maxLength={500}
                  value={formValues.address}
                  onChange={handleProfileChange}
                />
              </label>
              <label className="owner-profile-field owner-profile-field-wide">
                <span>Profile image URL</span>
                <input
                  name="profileImage"
                  type="url"
                  maxLength={1000}
                  placeholder="https://example.com/profile.jpg"
                  value={formValues.profileImage}
                  onChange={handleProfileChange}
                />
              </label>
            </div>
            {profileMessage && (
              <p className={`owner-profile-message${profileError ? ' is-error' : ' is-success'}`} role={profileError ? 'alert' : 'status'}>
                {profileMessage}
              </p>
            )}
            <div className="owner-profile-form-actions">
              <button
                className="owner-button owner-button-outline"
                type="button"
                disabled={isSavingProfile}
                onClick={cancelEditing}
              >
                Cancel
              </button>
              <button className="owner-button owner-button-primary" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <ProfileDetailsGrid fields={fields} className="owner-profile-fields" />
            {profileMessage && <p className="owner-profile-message is-success" role="status">{profileMessage}</p>}
          </>
        )}
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