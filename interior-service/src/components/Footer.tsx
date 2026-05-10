export default function Footer() {
  return (
    <footer className="vrb-footer">
      <div className="vrb-container">
        <div className="vrb-footer-grid">
          <div>
            <h3>Luxe Interiors</h3>
            <p>
              Award-winning interior design studio crafting bespoke living and working environments for discerning clients worldwide since 2009.
            </p>
            <div className="vrb-footer-badges">
              <span>AD100 Listed</span>
              <span>ASID Member</span>
              <span>LEED Certified</span>
              <span>Elle Décor Top 25</span>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              {['Instagram', 'Pinterest', 'Houzz', 'LinkedIn'].map(s => (
                <a
                  key={s}
                  href="#"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>Services</h4>
            {['Living Room Design', 'Kitchen & Dining', 'Bedroom Design', 'Commercial Spaces', 'Luxury Bathrooms', 'Outdoor & Landscape'].map(s => (
              <a key={s} href="#">{s}</a>
            ))}
          </div>

          <div>
            <h4>Company</h4>
            {['About Us', 'Portfolio', 'Press & Media', 'Careers', 'Blog', 'Contact'].map(s => (
              <a key={s} href="#">{s}</a>
            ))}
            <h4 style={{ marginTop: 24 }}>Contact</h4>
            <a href="tel:+12125558899">+1 (212) 555-8899</a>
            <a href="mailto:hello@luxeinteriors.com">hello@luxeinteriors.com</a>
          </div>
        </div>
      </div>
      <div className="vrb-footer-bottom">
        © {new Date().getFullYear()} Luxe Interiors Studio. All rights reserved. · Privacy Policy · Terms of Service
      </div>
    </footer>
  );
}
