import { useOutletContext } from 'react-router-dom';

function OwnerProfile() {
  const { profile } = useOutletContext();
  const fields = [
    ['Full name', profile.fullName],
    ['Email address', profile.email],
    ['Phone', profile.phone || 'Not provided'],
    ['Occupation', profile.occupation || 'Not provided'],
    ['Address', profile.address || 'Not provided'],
    ['Verification', profile.isVerified ? 'Verified' : 'Not verified'],
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
      <section className="owner-panel owner-profile-panel">
        <div className="owner-panel-heading">
          <div>
            <span className="owner-eyebrow">PERSONAL INFORMATION</span>
            <h2>Profile details</h2>
          </div>
          <span className={`owner-profile-verification${profile.isVerified ? ' is-verified' : ''}`}>
            {profile.isVerified ? 'Verified' : 'Not verified'}
          </span>
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
    </>
  );
}

export default OwnerProfile;