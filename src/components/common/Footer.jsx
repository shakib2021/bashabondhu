function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand-group">
          <a className="brand footer-brand" href="#home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M5 18.2 20 6l15 12.2v15.3a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 5 33.5V18.2Z" fill="currentColor" />
                <path d="M16 36V23h8v13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m2.5 18.5 17.5-14 17.5 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="brand-name">Basha<span>Bondhu</span></span>
          </a>
          <p>Find your place. Feel at home.</p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>Company</h4>
            <a href="#about">About us</a>
            <a href="#how-it-works">How it works</a>
            <a href="#homes">Featured homes</a>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <a href="#home">Contact us</a>
            <a href="#home">Help center</a>
            <a href="#home">FAQs</a>
          </div>

          <div className="footer-column">
            <h4>Legal</h4>
            <a href="#home">Privacy policy</a>
            <a href="#home">Terms of use</a>
            <a href="#home">Cookie policy</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 BashaBondhu</p>
        <a href="#home" className="back-top">Back to top ↑</a>
      </div>
    </footer>
  );
}

export default Footer;