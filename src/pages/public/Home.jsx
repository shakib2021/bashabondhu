import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import './Home.css';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import { getPublicProperties } from '../../utils/propertyApi';

const POPULAR_RATING = 4.5;
const NEW_LISTING_WINDOW = 2 * 24 * 60 * 60 * 1000;
const artworkClasses = ['home-art-one', 'home-art-two', 'home-art-three'];
const genderSearchTerms = {
  men: ['men', 'male'],
  women: ['women', 'female'],
  any: ['any', 'either'],
};

function filterProperties(properties, query, genderFilter, accommodationFilter) {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const genderTerms = Object.entries(genderSearchTerms)
    .filter(([, terms]) => searchTerms.some((term) => terms.includes(term)))
    .map(([gender]) => gender);
  const textTerms = searchTerms.filter((term) => (
    !Object.values(genderSearchTerms).some((terms) => terms.includes(term))
    && term !== 'gender'
  ));

  return properties.filter((property) => {
    const propertyGender = (property.gender || 'any').trim().toLowerCase();
    const propertyAccommodation = (property.accommodation_type || '').trim().toLowerCase();

    if (genderFilter !== 'all' && propertyGender !== genderFilter) return false;
    if (accommodationFilter !== 'all' && propertyAccommodation !== accommodationFilter) return false;
    if (genderTerms.length > 0 && !genderTerms.includes(propertyGender)) {
      return false;
    }

    const searchableText = [
      property.title,
      property.description,
      property.address,
      property.location,
      property.city,
      property.accommodation_type,
    ].filter(Boolean).join(' ').toLowerCase();

    return textTerms.every((term) => searchableText.includes(term));
  });
}

function ListingArtwork({ property, index }) {
  const postedAt = new Date(property.createdAt).getTime();
  const age = Date.now() - postedAt;
  const badges = [];

  if (Number(property.rating) >= POPULAR_RATING) badges.push('Popular');
  if (property.isVerified === true) badges.push('Verified');
  if (Number.isFinite(postedAt) && age >= 0 && age <= NEW_LISTING_WINDOW) badges.push('New listing');

  return (
    <div className={`home-card-art ${artworkClasses[index % artworkClasses.length]}`}>
      {property.images?.[0] ? (
        <img className="listing-photo" src={property.images[0]} alt={`${property.title} accommodation`} loading="lazy" />
      ) : (
        <>
          <div className="card-building">
            <span className="building-roof" />
            <span className="building-face"><i /><i /><i /><i /></span>
          </div>
          <span className="card-plant" />
        </>
      )}
      {badges.length > 0 && (
        <div className="listing-tags" aria-label="Listing highlights">
          {badges.map((badge) => <span className={`listing-tag listing-tag-${badge.toLowerCase().replace(' ', '-')}`} key={badge}>{badge}</span>)}
        </div>
      )}
      <span className="save-home" aria-hidden="true">♡</span>
    </div>
  );
}

function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [genderFilter, setGenderFilter] = useState('all');
  const [accommodationFilter, setAccommodationFilter] = useState('all');
  const searchTerm = (searchParams.get('search') || '').trim();
  const genderOptions = [...new Set(properties.map((property) => (
    (property.gender || 'any').trim().toLowerCase()
  )))].sort();
  const accommodationOptions = [...new Set(properties
    .map((property) => property.accommodation_type?.trim())
    .filter(Boolean))].sort((first, second) => first.localeCompare(second));
  const hasActiveFilters = searchTerm || genderFilter !== 'all' || accommodationFilter !== 'all';
  const filteredProperties = filterProperties(
    properties,
    searchTerm,
    genderFilter,
    accommodationFilter,
  );
  const displayedProperties = hasActiveFilters ? filteredProperties : filteredProperties.slice(0, 6);

  const clearFilters = () => {
    setGenderFilter('all');
    setAccommodationFilter('all');
    setSearchParams({});
  };

  useEffect(() => {
    let isMounted = true;
    setLoadStatus('loading');

    getPublicProperties()
      .then((listings) => {
        if (isMounted) {
          setProperties(listings);
          setLoadStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load homes right now.');
          setLoadStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  return (
    <>
      <Navbar />
      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> A better way to find your place</p>
            <h1>Find a place<br />that feels like <span>home.</span></h1>
            <p className="hero-description">
              Finding a home should feel exciting, not overwhelming. Meet the people and places
              that make your next move feel right.
            </p>
            <div className="hero-actions">
              <a className="button" href="#homes">
                Find your home
                <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#how-it-works">
                See how it works <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>R</span><span>M</span><span>S</span><span className="avatar-more">+</span>
              </div>
              <p><strong>Good people, good homes.</strong><br />A community you can feel good about.</p>
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration of a welcoming home">
            <div className="visual-sun" />
            <div className="visual-note">
              <span className="note-icon" aria-hidden="true">✦</span>
              <span><strong>Good things</strong><br />start at home</span>
            </div>
            <div className="illustrated-home">
              <div className="home-roof" />
              <div className="home-body">
                <div className="home-window window-left"><span /></div>
                <div className="home-door"><span /></div>
                <div className="home-window window-right"><span /></div>
              </div>
              <div className="home-step" />
            </div>
            <div className="visual-plant plant-left"><i /><i /><i /></div>
            <div className="visual-plant plant-right"><i /><i /><i /></div>
            <div className="visual-ground" />
            <div className="visual-location"><span aria-hidden="true">⌖</span> Dhaka, Bangladesh</div>
          </div>
        </section>

        <section className="trust-strip" aria-label="BashaBondhu benefits">
          <div><span className="trust-icon">✓</span><span>Homes checked with care</span></div>
          <div><span className="trust-icon">♡</span><span>People-first, always</span></div>
          <div><span className="trust-icon">⌖</span><span>Made for your neighborhood</span></div>
        </section>

        <section className="homes-section section-wrap" id="homes">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A place to begin</p>
              <h2>Homes worth <span>coming home to.</span></h2>
              <p className="section-description">
                {searchTerm && (genderFilter !== 'all' || accommodationFilter !== 'all')
                  ? `${filteredProperties.length} homes match your search and filters.`
                  : searchTerm
                  ? `${filteredProperties.length} homes found for “${searchTerm}”.`
                  : hasActiveFilters
                    ? `${filteredProperties.length} homes match your filters.`
                    : 'A few lovely places to get your search started.'}
              </p>
            </div>
            <a href="#how-it-works" className="browse-link">See how to find yours <span aria-hidden="true">→</span></a>
          </div>
          <div className="listing-filters" aria-label="Filter listings">
            <label className="listing-filter">
              <span>Rent is for</span>
              <select
                aria-label="Filter by gender"
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                disabled={loadStatus !== 'ready' || genderOptions.length === 0}
              >
                <option value="all">All genders</option>
                {genderOptions.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender === 'any' ? 'Any gender' : `${gender[0].toUpperCase()}${gender.slice(1)}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="listing-filter">
              <span>Home type</span>
              <select
                aria-label="Filter by accommodation type"
                value={accommodationFilter}
                onChange={(event) => setAccommodationFilter(event.target.value)}
                disabled={loadStatus !== 'ready' || accommodationOptions.length === 0}
              >
                <option value="all">All types</option>
                {accommodationOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            {hasActiveFilters && (
              <button className="listing-filter-clear" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
          {loadStatus === 'loading' && <p className="listing-load-state" role="status">Finding available homes…</p>}
          {loadStatus === 'error' && (
            <div className="listing-load-state" role="alert">
              <span>{errorMessage}</span>
              <button className="listing-retry" type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
            </div>
          )}
          {loadStatus === 'ready' && properties.length === 0 && !searchTerm && (
            <p className="listing-load-state">No homes are available right now. Check back soon.</p>
          )}
          {loadStatus === 'ready' && displayedProperties.length === 0 && hasActiveFilters && (
            <p className="listing-load-state" role="status">
              No homes match your search and filters.{' '}
              <button className="listing-filter-clear" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </p>
          )}
          {loadStatus === 'ready' && displayedProperties.length > 0 && (
            <div className="home-grid">
              {displayedProperties.map((property, index) => (
                <Link className="home-card-link" to={`/properties/${property._id}`} key={property._id} aria-label={`View ${property.title}`}>
                  <article className="home-card">
                    <ListingArtwork property={property} index={index} />
                    <div className="home-card-copy">
                      <p className="home-area"><span aria-hidden="true">⌖</span> {property.location}, {property.city}</p>
                      <h3>{property.title}</h3>
                      <p className="home-details">
                        {property.bedrooms} beds · {property.bathrooms} baths · {property.number_of_rooms} rooms
                      </p>
                      <div className="home-price">৳ {Number(property.monthly_rent).toLocaleString()}<span> / month</span></div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-wrap how-inner">
            <div className="how-intro">
              <p className="eyebrow">A little less searching, a lot more settling in</p>
              <h2>Your next chapter,<br /><span>in three easy steps.</span></h2>
              <p>We bring the right homes and helpful people together, so you can focus on what matters: feeling at home.</p>
            </div>
            <div className="steps">
              <article className="step">
                <span className="step-number">01</span>
                <div className="step-icon" aria-hidden="true">⌕</div>
                <h3>Tell us what feels right</h3>
                <p>Share your neighborhood, budget, and the little things that make a place yours.</p>
              </article>
              <article className="step">
                <span className="step-number">02</span>
                <div className="step-icon" aria-hidden="true">⌂</div>
                <h3>Meet your kind of home</h3>
                <p>Explore thoughtful listings and connect with people who are ready to help.</p>
              </article>
              <article className="step">
                <span className="step-number">03</span>
                <div className="step-icon" aria-hidden="true">♡</div>
                <h3>Make yourself at home</h3>
                <p>Find your place, settle in, and start making everyday memories.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="about-section section-wrap" id="about">
          <div className="about-mark" aria-hidden="true">⌂</div>
          <div>
            <p className="eyebrow">A good neighbor makes all the difference</p>
            <h2>Home is more than<br />four <span>walls.</span></h2>
          </div>
          <p className="about-copy">BashaBondhu means a friend for your home. We’re here to make finding a place feel more personal, more trustworthy, and a little more like finding a friend.</p>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Home;