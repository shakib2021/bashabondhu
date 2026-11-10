import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowDownRight, ArrowLeft, ArrowRight, Check, House, MapPin } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import './Home.css';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import { getPublicProperties } from '../../utils/propertyApi';
import { getStoredUser } from '../../utils/authStorage';
import ReportListingButton from '../../components/common/ReportListingButton';
import WatchlistButton from '../../components/common/WatchlistButton';
import { getMyWatchlist } from '../../utils/watchlistApi';

const POPULAR_RATING = 4.5;
const NEW_LISTING_WINDOW = 2 * 24 * 60 * 60 * 1000;
const artworkClasses = ['home-art-one', 'home-art-two', 'home-art-three', 'home-art-four'];
const genderSearchTerms = {
  men: ['men', 'male'],
  women: ['women', 'female'],
  any: ['any', 'either'],
};

function HomeLoader({ compact = false }) {
  return (
    <div className={`home-loader${compact ? ' home-loader-compact' : ''}`} role="status">
      <span className="home-loader-mark" aria-hidden="true"><House /></span>
      <span className="home-loader-copy">
        <strong>Finding your next place</strong>
        <span>Gathering fresh listings for you</span>
      </span>
      <span className="home-loader-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

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
    if (
      accommodationFilter !== 'all'
      && propertyAccommodation !== accommodationFilter.trim().toLowerCase()
    ) return false;
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

function ListingArtwork({
  property,
  propertyId,
  index,
  watched,
  onWatchlistChange,
  onSignInRequired,
  disableWatchlist,
}) {
  const postedAt = new Date(property.createdAt).getTime();
  const age = Date.now() - postedAt;
  const badges = [];

  if (Number(property.rating) >= POPULAR_RATING) badges.push('Popular');
  if (Number.isFinite(postedAt) && age >= 0 && age <= NEW_LISTING_WINDOW) badges.push('New listing');

  return (
    <div className={`home-card-art ${artworkClasses[index % artworkClasses.length]}`}>
      {property.images?.[0] ? (
        <img className="listing-photo" src={property.images[0]} alt={`${property.title} accommodation`} loading="lazy" />
      ) : null}
      {property.isVerified === true && (
        <span className="listing-verified-corner"><Check aria-hidden="true" /> Verified</span>
      )}
      {badges.length > 0 && (
        <div className="listing-tags" aria-label="Listing highlights">
          {badges.map((badge) => <span className={`listing-tag listing-tag-${badge.toLowerCase().replace(' ', '-')}`} key={badge}>{badge}</span>)}
        </div>
      )}
      <ReportListingButton
        propertyId={propertyId}
        propertyTitle={property.title}
        onSignInRequired={onSignInRequired}
      />
      <WatchlistButton
        propertyId={propertyId}
        watched={watched}
        onChange={onWatchlistChange}
        onSignInRequired={onSignInRequired}
        disabled={disableWatchlist}
      />
    </div>
  );
}

function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [userSession, setUserSession] = useState(getStoredUser);
  const [watchedPropertyIds, setWatchedPropertyIds] = useState(() => new Set());
  const [watchlistStatus, setWatchlistStatus] = useState('idle');
  const [watchlistError, setWatchlistError] = useState('');
  const [watchlistReloadKey, setWatchlistReloadKey] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [genderFilter, setGenderFilter] = useState('all');
  const [accommodationFilter, setAccommodationFilter] = useState('all');
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
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
  const featuredProperties = properties.slice(0, 5);
  const isWatchlistLoading = watchlistStatus === 'loading';
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    const syncUser = () => setUserSession(getStoredUser());
    window.addEventListener('bashabondhu:auth-change', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('bashabondhu:auth-change', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

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

  useEffect(() => {
    let isMounted = true;

    if (!userSession?.token) {
      setWatchedPropertyIds(new Set());
      setWatchlistError('');
      setWatchlistStatus('idle');
      return () => {
        isMounted = false;
      };
    }

    setWatchlistStatus('loading');
    setWatchlistError('');
    getMyWatchlist()
      .then((listings) => {
        if (isMounted) {
          setWatchedPropertyIds(new Set(listings.map((property) => String(property._id || property.id))));
          setWatchlistStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setWatchlistError(error.message || 'Could not load your saved homes.');
          setWatchlistStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userSession?.id, userSession?.token, watchlistReloadKey]);

  useEffect(() => {
    if (!emblaApi) return undefined;

    const updateActiveSlide = () => setActiveSlide(emblaApi.selectedScrollSnap());
    updateActiveSlide();
    emblaApi.on('select', updateActiveSlide);
    emblaApi.on('reInit', updateActiveSlide);

    return () => {
      emblaApi.off('select', updateActiveSlide);
      emblaApi.off('reInit', updateActiveSlide);
    };
  }, [emblaApi]);

  useEffect(() => {
    setActiveSlide(0);
    emblaApi?.scrollTo(0, true);
  }, [emblaApi, properties]);

  const handleSignInRequired = () => {
    navigate('/login', { state: { from: returnTo } });
  };

  const handleWatchlistChange = (propertyId, watched) => {
    setWatchedPropertyIds((currentIds) => {
      const updatedIds = new Set(currentIds);
      if (watched) {
        updatedIds.add(String(propertyId));
      } else {
        updatedIds.delete(String(propertyId));
      }
      return updatedIds;
    });
    setWatchlistError('');
  };

  return (
    <>
      <Navbar />
      <main>
        <section className="hero" id="home">
          <div
            className="featured-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label="Featured homes"
          >
            {loadStatus === 'loading' && (
              <HomeLoader />
            )}
            {loadStatus === 'error' && (
              <p className="featured-status" role="status">Featured homes are temporarily unavailable.</p>
            )}
            {loadStatus === 'ready' && featuredProperties.length > 0 && (
              <>
                <div className="featured-viewport" ref={emblaRef}>
                  <div className="featured-track">
                    {featuredProperties.map((property, index) => {
                      const isActive = index === activeSlide;

                      return (
                        <article
                          className="featured-slide"
                          key={property._id}
                          role="group"
                          aria-roledescription="slide"
                          aria-label={`${index + 1} of ${featuredProperties.length}`}
                          aria-hidden={!isActive}
                        >
                          <Link
                            className="featured-post"
                            to={`/properties/${property._id}`}
                            aria-label={`View ${property.title} listing`}
                            tabIndex={isActive ? undefined : -1}
                          >
                            {property.images?.[0] ? (
                              <img
                                className="featured-photo"
                                src={property.images[0]}
                                alt=""
                                loading={index === 0 ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <span className={`featured-photo-placeholder home-art-${['one', 'two', 'three'][index % 3]}`} />
                            )}
                            <span className="featured-shade" aria-hidden="true" />
                            <span className="featured-post-content">
                              {property.accommodation_type && (
                                <span className="featured-category">{property.accommodation_type}</span>
                              )}
                              <h1>{property.title}</h1>
                              {(property.location || property.city || property.address) && (
                                <span className="featured-location">
                                  <MapPin aria-hidden="true" />
                                  {[property.location, property.city].filter(Boolean).join(', ') || property.address}
                                </span>
                              )}
                              {property.description && (
                                <span className="featured-description">{property.description}</span>
                              )}
                              <span className="featured-post-meta">
                                {property.monthly_rent !== undefined
                                  && property.monthly_rent !== null
                                  && property.monthly_rent !== ''
                                  && (
                                    <span className="featured-price">
                                      ৳ {Number(property.monthly_rent).toLocaleString()}
                                      <span> / month</span>
                                    </span>
                                  )}
                                {[
                                  property.bedrooms !== undefined && property.bedrooms !== null && property.bedrooms !== ''
                                    ? `${property.bedrooms} beds`
                                    : null,
                                  property.bathrooms !== undefined && property.bathrooms !== null && property.bathrooms !== ''
                                    ? `${property.bathrooms} baths`
                                    : null,
                                  property.number_of_rooms !== undefined
                                    && property.number_of_rooms !== null
                                    && property.number_of_rooms !== ''
                                    ? `${property.number_of_rooms} rooms`
                                    : null,
                                ].filter(Boolean).map((detail) => (
                                  <span className="featured-detail" key={detail}>{detail}</span>
                                ))}
                              </span>
                            </span>
                            <span className="featured-open-icon" aria-hidden="true"><ArrowDownRight /></span>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                </div>
                <div className="featured-controls" role="group" aria-label="Featured home controls">
                  <button
                    type="button"
                    onClick={() => emblaApi?.scrollPrev()}
                    aria-label="Previous featured home"
                    disabled={featuredProperties.length < 2}
                  >
                    <ArrowLeft aria-hidden="true" />
                  </button>
                  <div className="featured-indicators" aria-label="Choose featured home">
                    {featuredProperties.map((property, index) => (
                      <button
                        type="button"
                        key={property._id}
                        className={index === activeSlide ? 'is-active' : ''}
                        aria-label={`Show featured home ${index + 1}`}
                        aria-current={index === activeSlide ? 'true' : undefined}
                        onClick={() => emblaApi?.scrollTo(index)}
                      />
                    ))}
                  </div>
                  <span className="featured-count">{String(activeSlide + 1).padStart(2, '0')} / {String(featuredProperties.length).padStart(2, '0')}</span>
                  <button
                    type="button"
                    onClick={() => emblaApi?.scrollNext()}
                    aria-label="Next featured home"
                    disabled={featuredProperties.length < 2}
                  >
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
            {loadStatus === 'ready' && featuredProperties.length === 0 && (
              <p className="featured-status" role="status">No listings available.</p>
            )}
          </div>
        </section>

        <section className="homes-section section-wrap" id="homes">
          <div className="section-heading">
            <div>
              <h2>Homes for rent</h2>
              <p className="section-description">
                {searchTerm && (genderFilter !== 'all' || accommodationFilter !== 'all')
                  ? `${filteredProperties.length} homes match your search and filters.`
                  : searchTerm
                  ? `${filteredProperties.length} homes found for “${searchTerm}”.`
                  : hasActiveFilters
                    ? `${filteredProperties.length} homes match your filters.`
                    : 'Fresh listings from across Dhaka.'}
              </p>
            </div>
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
          {loadStatus === 'loading' && <HomeLoader compact />}
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
              {displayedProperties.map((property, index) => {
                const propertyId = property._id || property.id;
                return (
                  <article className="home-card" key={propertyId}>
                    <ListingArtwork
                      property={property}
                      propertyId={propertyId}
                      index={index}
                      watched={watchedPropertyIds.has(String(propertyId))}
                      onWatchlistChange={(watched) => handleWatchlistChange(propertyId, watched)}
                      onSignInRequired={handleSignInRequired}
                      disableWatchlist={isWatchlistLoading}
                    />
                    <Link className="home-card-link" to={`/properties/${propertyId}`} aria-label={`View ${property.title}`}>
                      <div className="home-card-copy">
                        <div className="home-card-tags">
                          {property.accommodation_type?.toLowerCase().includes('mess') ? (
                            <span className="home-type-tag">
                              Mess
                              {property.gender && property.gender !== 'any' && ` · ${property.gender[0].toUpperCase()}${property.gender.slice(1)}`}
                            </span>
                          ) : property.accommodation_type && (
                            <span className="home-type-tag">{property.accommodation_type}</span>
                          )}
                          {property.status?.toLowerCase() === 'available' && (
                            <span className="home-status home-status-available home-status-sr-only">{property.status}</span>
                          )}
                          {property.status && property.status.toLowerCase() !== 'available' && (
                            <span className={`home-status home-status-${property.status.toLowerCase()}`}>{property.status}</span>
                          )}
                        </div>
                        <h3>{property.title}</h3>
                        <p className="home-area"><MapPin aria-hidden="true" /> {property.location}, {property.city}</p>
                        <p className="home-details">
                          {property.bedrooms} beds · {property.bathrooms} baths · {property.number_of_rooms} rooms
                        </p>
                        <div className="home-price">৳ {Number(property.monthly_rent).toLocaleString()}<span> / month</span></div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
          {watchlistStatus === 'error' && (
            <p className="watchlist-load-error" role="alert">
              {watchlistError}{' '}
              <button type="button" onClick={() => setWatchlistReloadKey((key) => key + 1)}>
                Retry
              </button>
            </p>
          )}
        </section>

      </main>

      <Footer />
    </>
  );
}

export default Home;