import { useState, useEffect } from 'react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = ['Home', 'Services', 'Portfolio', 'About', 'Contact'];

  return (
    <nav className="vrb-navbar" style={{ background: scrolled ? undefined : 'linear-gradient(135deg, rgba(30,30,30,0.95), rgba(60,40,20,0.92))', padding: '4px 0' }}>
      <div className="vrb-nav-container">
        <a href="#" className="vrb-logo" style={{ gap: '6px' }}>
          <img 
            src="https://vshakago.in/logo.png" 
            alt="logo" 
            style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }}
          />
          <div>
            <div className="vrb-brand-top" style={{ fontSize: '12px', lineHeight: '1.1' }}>INTERIORS</div>
            <div className="logo-caption" style={{ fontSize: '8px', lineHeight: '1.1' }}>Crafting Beautiful Spaces</div>
          </div>
        </a>

        <nav className={`vrb-nav-links${open ? ' open' : ''}`}>
          <ul>
            {links.map(l => (
              <li key={l}>
                <a href={`#${l.toLowerCase()}`} className={l === 'Home' ? 'active' : ''} onClick={() => setOpen(false)} style={{ fontSize: '11px', padding: '6px 10px' }}>
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="vrb-nav-actions" style={{ display: 'flex' }}>
          <a href="#contact" className="vrb-btn-nav" style={{ cursor: 'pointer', fontSize: '11px', padding: '6px 12px' }}>Book Consultation</a>
        </div>

        <button className="vrb-hamburger" onClick={() => setOpen(!open)} aria-label="Menu" style={{ fontSize: '16px', padding: '6px 10px' }}>
          {open ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
}
