import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Pause, Play, Search, ShoppingBag } from 'lucide-react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';
import { getMarketplaceItems } from '../../utils/marketplaceApi';
import './Marketplace.css';

const formatPrice = (value) => `৳${Number(value).toLocaleString('en-BD')}`;
const CAROUSEL_AUTOPLAY_INTERVAL = 2000;
const MARKETPLACE_AREAS = ['Mohammadpur', 'Dhanmondi', 'Uttara', 'Mirpur', 'Gulshan', 'Banani'];

function Marketplace() {
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const filteredItems = useMemo(() => (
    selectedArea
      ? items.filter((item) => item.location?.toLowerCase().includes(selectedArea.toLowerCase()))
      : items
  ), [items, selectedArea]);

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
    if (!emblaApi) return;

    emblaApi.reInit();
    emblaApi.scrollTo(0, true);
    setActiveSlide(0);
  }, [emblaApi, filteredItems]);

  useEffect(() => {
    if (
      !emblaApi
      || filteredItems.length < 2
      || isCarouselPaused
      || isCarouselHovered
      || status !== 'ready'
    ) return undefined;

    const intervalId = window.setInterval(
      () => emblaApi.scrollNext(),
      CAROUSEL_AUTOPLAY_INTERVAL,
    );
    return () => window.clearInterval(intervalId);
  }, [emblaApi, filteredItems.length, isCarouselHovered, isCarouselPaused, status]);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');
    getMarketplaceItems(activeSearch)
      .then((results) => {
        if (isMounted) {
          setItems(results);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load marketplace items.');
          setStatus('error');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [activeSearch]);

  const handleSearch = (event) => {
    event.preventDefault();
    setActiveSearch(search.trim());
  };

  return (
    <>
      <Navbar />
      <main className="marketplace-page">
        {status === 'ready' && filteredItems.length > 0 && (
          <div
            role="region"
            className="marketplace-hero"
            aria-roledescription="carousel"
            aria-label="Marketplace listings"
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
            onFocusCapture={() => setIsCarouselPaused(true)}
          >
            <div className="marketplace-hero-viewport" ref={emblaRef}>
              <div className="marketplace-hero-track">
                {filteredItems.map((item, index) => {
                  const isActive = index === activeSlide;

                  return (
                    <article
                      className="marketplace-hero-slide"
                      key={item._id}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${index + 1} of ${filteredItems.length}`}
                      aria-hidden={!isActive}
                    >
                      <Link
                        className="marketplace-hero-post"
                        to={`/marketplace/items/${item._id}`}
                        aria-label={`View ${item.title} listing`}
                        tabIndex={isActive ? undefined : -1}
                      >
                        {item.images?.[0]
                          ? <img className="marketplace-hero-image" src={item.images[0]} alt="" />
                          : <span className="marketplace-hero-placeholder" aria-hidden="true"><ShoppingBag /></span>}
                        <span className="marketplace-hero-shade" aria-hidden="true" />
                        <span className="marketplace-hero-post-content">
                          {item.condition && <span className="marketplace-hero-condition">{item.condition}</span>}
                          <h1>{item.title}</h1>
                          {item.location && <span className="marketplace-hero-location">{item.location}</span>}
                          <strong>{formatPrice(item.price)}</strong>
                        </span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
            {filteredItems.length > 1 && (
              <div className="marketplace-hero-controls" role="group" aria-label="Marketplace listing controls">
                <button type="button" onClick={() => emblaApi?.scrollPrev()} aria-label="Previous marketplace listing">
                  <ArrowLeft aria-hidden="true" />
                </button>
                <div className="marketplace-hero-indicators" aria-label="Choose marketplace listing">
                  {filteredItems.map((item, index) => (
                    <button
                      type="button"
                      key={item._id}
                      className={index === activeSlide ? 'is-active' : ''}
                      aria-label={`Show marketplace listing ${index + 1}`}
                      aria-current={index === activeSlide ? 'true' : undefined}
                      onClick={() => emblaApi?.scrollTo(index)}
                    />
                  ))}
                </div>
                <span className="marketplace-hero-count">
                  {String(activeSlide + 1).padStart(2, '0')} / {String(filteredItems.length).padStart(2, '0')}
                </span>
                <button type="button" onClick={() => emblaApi?.scrollNext()} aria-label="Next marketplace listing">
                  <ArrowRight aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCarouselPaused((paused) => !paused)}
                  aria-label={isCarouselPaused ? 'Resume automatic marketplace slides' : 'Pause automatic marketplace slides'}
                  aria-pressed={isCarouselPaused}
                >
                  {isCarouselPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                </button>
              </div>
            )}
          </div>
        )}

        <section className="marketplace-content" aria-labelledby="marketplace-list-title">
          <div className="marketplace-section-heading">
            <div>
              <span className="marketplace-eyebrow">PRE-LOVED, READY FOR YOU</span>
              <h2 id="marketplace-list-title">Browse items</h2>
            </div>
            <form className="marketplace-search" onSubmit={handleSearch} role="search">
              <label className="visually-hidden" htmlFor="marketplace-search">Search items by name or location</label>
              <input
                id="marketplace-search"
                type="search"
                placeholder="Search name or location"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <div className="marketplace-area-filters" role="group" aria-label="Search by area">
            <span>Search by area</span>
            <button
              type="button"
              className={`marketplace-area-button${selectedArea === '' ? ' is-active' : ''}`}
              aria-pressed={selectedArea === ''}
              onClick={() => setSelectedArea('')}
            >
              All areas
            </button>
            {MARKETPLACE_AREAS.map((area) => (
              <button
                type="button"
                key={area}
                className={`marketplace-area-button${selectedArea === area ? ' is-active' : ''}`}
                aria-pressed={selectedArea === area}
                onClick={() => setSelectedArea(area)}
              >
                {area}
              </button>
            ))}
          </div>

          {status === 'loading' && <p className="marketplace-state">Loading items…</p>}
          {status === 'error' && <p className="marketplace-state marketplace-error" role="alert">{errorMessage}</p>}
          {status === 'ready' && filteredItems.length === 0 && (
            <div className="marketplace-empty">
              <Search aria-hidden="true" />
              <h3>No items found</h3>
              <p>
                {selectedArea
                  ? `There are no items in ${selectedArea} yet. Try another area or be the first to list something.`
                  : 'Try another search, or be the first to list something for the community.'}
              </p>
              <Link className="marketplace-primary-button" to="/marketplace/sell">List an item</Link>
            </div>
          )}
          {status === 'ready' && filteredItems.length > 0 && (
            <div className="marketplace-grid">
              {filteredItems.map((item) => (
                <Link className="marketplace-card" to={`/marketplace/items/${item._id}`} key={item._id}>
                  <div className="marketplace-card-image">
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt={item.title} />
                      : <span className="marketplace-card-placeholder" aria-hidden="true"><ShoppingBag /></span>}
                    <span className="marketplace-condition">{item.condition}</span>
                  </div>
                  <div className="marketplace-card-copy">
                    <div className="marketplace-card-top">
                      <h3>{item.title}</h3>
                      <strong>{formatPrice(item.price)}</strong>
                    </div>
                    <p>{item.location}</p>
                    <span className="marketplace-card-link">View item <ArrowRight aria-hidden="true" /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <p className="marketplace-offline-note">Buying and payment are arranged directly between buyer and seller offline.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Marketplace;
