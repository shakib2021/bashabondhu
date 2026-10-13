import Navbar from '../../components/common/Navbar';
import './Home.css';
import Footer from '../../components/common/Footer';
import '../../components/common/footer.css';

const homes = [
  {
    area: 'Dhanmondi, Dhaka',
    name: 'A sunny little home in the city',
    price: '৳ 18,500',
    details: '2 beds · 2 baths · 1,050 sq ft',
    className: 'home-art-one',
    tag: 'Popular',
  },
  {
    area: 'Uttara, Dhaka',
    name: 'Room to grow, room to breathe',
    price: '৳ 14,000',
    details: '3 beds · 2 baths · 1,200 sq ft',
    className: 'home-art-two',
    tag: 'New listing',
  },
  {
    area: 'Bashundhara, Dhaka',
    name: 'A peaceful place to call yours',
    price: '৳ 22,000',
    details: '3 beds · 3 baths · 1,450 sq ft',
    className: 'home-art-three',
    tag: 'Verified',
  },
];

function Home() {
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
              <p className="section-description">A few lovely places to get your search started.</p>
            </div>
            <a href="#how-it-works" className="browse-link">See how to find yours <span aria-hidden="true">→</span></a>
          </div>
          <div className="home-grid">
            {homes.map((home) => (
              <article className="home-card" key={home.name}>
                <div className={`home-card-art ${home.className}`}>
                  <span className="listing-tag">{home.tag}</span>
                  <span className="save-home" aria-label="Save home">♡</span>
                  <div className="card-building">
                    <span className="building-roof" />
                    <span className="building-face"><i /><i /><i /><i /></span>
                  </div>
                  <span className="card-plant" />
                </div>
                <div className="home-card-copy">
                  <p className="home-area"><span aria-hidden="true">⌖</span> {home.area}</p>
                  <h3>{home.name}</h3>
                  <p className="home-details">{home.details}</p>
                  <div className="home-price">{home.price}<span> / month</span></div>
                </div>
              </article>
            ))}
          </div>
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