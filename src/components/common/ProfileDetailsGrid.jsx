import { BriefcaseBusiness, House, Mail, Phone, UserRound } from 'lucide-react';

const FIELD_ICONS = {
  'Full name': UserRound,
  'Email address': Mail,
  Phone,
  Occupation: BriefcaseBusiness,
  Address: House,
};

function ProfileDetailsGrid({ fields, className = '' }) {
  return (
    <div className={`profile-details-grid${className ? ` ${className}` : ''}`}>
      {fields.map(([label, value]) => {
        const Icon = FIELD_ICONS[label] || UserRound;
        const isMissing = !value || value === 'Not provided';

        return (
          <div className="profile-detail-card" key={label}>
            <span className="profile-detail-icon" aria-hidden="true"><Icon /></span>
            <div className="profile-detail-copy">
              <span>{label}</span>
              <strong className={isMissing ? 'is-missing' : ''}>{value || 'Not provided'}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProfileDetailsGrid;
