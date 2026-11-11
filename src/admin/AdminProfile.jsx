import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ProfileIdentityCard from '../components/common/ProfileIdentityCard';
import ProfileDetailsGrid from '../components/common/ProfileDetailsGrid';
import { updateUserInfo } from '../utils/userApi';

function AdminProfile() {
  const { profile, onProfileUpdate } = useOutletContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    occupation: profile.occupation || '',
    address: profile.address || '',
    profileImage: profile.profileImage || '',
  });

  const beginEditing = () => {
    setFormValues({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      occupation: profile.occupation || '',
      address: profile.address || '',
      profileImage: profile.profileImage || '',
    });
    setMessage('');
    setHasError(false);
    setIsEditing(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setHasError(false);

    try {
      const fullName = formValues.fullName.trim();
      if (!fullName) throw new Error('Enter your full name.');
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
      onProfileUpdate(updatedProfile);
      setFormValues({
        fullName: updatedProfile.fullName || '',
        phone: updatedProfile.phone || '',
        occupation: updatedProfile.occupation || '',
        address: updatedProfile.address || '',
        profileImage: updatedProfile.profileImage || '',
      });
      setIsEditing(false);
      setMessage('Your profile has been updated.');
    } catch (error) {
      setMessage(error.message || 'Could not update your profile.');
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    ['Full name', profile.fullName],
    ['Email address', profile.email],
    ['Phone', profile.phone || 'Not provided'],
    ['Occupation', profile.occupation || 'Not provided'],
    ['Address', profile.address || 'Not provided'],
  ];

  return (
    <>
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">ACCOUNT</span>
          <h1>My profile</h1>
          <p>Your personal details connected to BashaBondhu.</p>
        </div>
      </section>
      <ProfileIdentityCard profile={profile} roleLabel="Admin" statusLabel="Platform administrator" />
      <section className="owner-panel owner-profile-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">PERSONAL INFORMATION</span>
            <h2>Profile details</h2>
          </div>
          {!isEditing && (
            <button className="owner-button owner-button-outline" type="button" onClick={beginEditing}>
              Edit profile
            </button>
          )}
        </div>
        {isEditing ? (
          <form className="owner-profile-form" onSubmit={handleSubmit}>
            <div className="owner-profile-fields">
              <label className="owner-profile-field">
                <span>Full name</span>
                <input name="fullName" autoComplete="name" required maxLength={255} value={formValues.fullName} onChange={handleChange} />
              </label>
              <label className="owner-profile-field">
                <span>Email address</span>
                <input value={profile.email} readOnly />
                <small>Email is managed by your sign-in provider.</small>
              </label>
              <label className="owner-profile-field">
                <span>Phone</span>
                <input name="phone" type="tel" autoComplete="tel" maxLength={30} value={formValues.phone} onChange={handleChange} />
              </label>
              <label className="owner-profile-field">
                <span>Occupation</span>
                <input name="occupation" autoComplete="organization-title" maxLength={150} value={formValues.occupation} onChange={handleChange} />
              </label>
              <label className="owner-profile-field owner-profile-field-wide">
                <span>Address</span>
                <textarea name="address" autoComplete="street-address" rows="3" maxLength={500} value={formValues.address} onChange={handleChange} />
              </label>
              <label className="owner-profile-field owner-profile-field-wide">
                <span>Profile image URL</span>
                <input name="profileImage" type="url" maxLength={1000} value={formValues.profileImage} onChange={handleChange} />
              </label>
            </div>
            {message && <p className={`owner-profile-message${hasError ? ' is-error' : ''}`} role={hasError ? 'alert' : 'status'}>{message}</p>}
            <div className="owner-profile-form-actions">
              <button className="owner-button owner-button-outline" type="button" disabled={isSaving} onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="owner-button owner-button-primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <ProfileDetailsGrid fields={fields} className="owner-profile-fields" />
            {message && <p className="owner-profile-message" role="status">{message}</p>}
          </>
        )}
      </section>
    </>
  );
}

export default AdminProfile;
