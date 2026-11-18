import { ArrowRight, Heart, House, MessageCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../components/common/Footer';
import Navbar from '../../components/common/Navbar';
import '../../components/common/footer.css';
import './HowToUse.css';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Search for a home',
    text: 'Use the search bar to find accommodation by location, or filter listings by gender preference and accommodation type.',
  },
  {
    number: '02',
    icon: House,
    title: 'Explore the details',
    text: 'Open a listing to review photos, rent, location, amenities, and the owner’s contact information.',
  },
  {
    number: '03',
    icon: Heart,
    title: 'Save what you like',
    text: 'Register or log in to keep useful properties on your watchlist so you can compare them later.',
  },
  {
    number: '04',
    icon: MessageCircle,
    title: 'Contact and visit',
    text: 'Send a contact request or schedule a visit directly from the listing, then follow up in your dashboard.',
  },
];

export default function HowToUse() {
  return (
    <div className="how-to-use-page">
      <Navbar />
      <main>
        <section className="how-to-use-hero">
          <div>
            <p className="how-to-use-eyebrow">A simple way to find your place</p>
            <h1>How to use BashaBondhu</h1>
            <p className="how-to-use-intro">
              From your first search to a confirmed visit, follow these four simple steps.
            </p>
            <Link className="how-to-use-primary" to="/#homes">
              Find a home <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="how-to-use-hero-card" aria-hidden="true">
            <span><House /></span>
            <span className="how-to-use-pulse one" />
            <span className="how-to-use-pulse two" />
          </div>
        </section>

        <section className="how-to-use-steps" aria-label="Using BashaBondhu">
          {steps.map(({ number, icon: Icon, title, text }) => (
            <article className="how-to-use-step" key={number}>
              <div className="how-to-use-step-head">
                <span className="how-to-use-step-number">{number}</span>
                <span className="how-to-use-step-icon"><Icon aria-hidden="true" /></span>
              </div>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="how-to-use-cta">
          <div>
            <p>Ready to get started?</p>
            <h2>Create an account and start saving homes.</h2>
          </div>
          <div className="how-to-use-cta-actions">
            <Link className="how-to-use-secondary" to="/login">Log in</Link>
            <Link className="how-to-use-primary" to="/register">Create account <ArrowRight aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
