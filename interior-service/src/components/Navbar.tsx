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
    <nav className="vrb-navbar" style={{ background: scrolled ? undefined : 'linear-gradient(135deg, rgba(30,30,30,0.95), rgba(60,40,20,0.92))' }}>
      <div className="vrb-nav-container">
        <a href="#" className="vrb-logo">
          <img src="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=80" alt="logo" />
          <div>
            <div className="vrb-brand-top">LUXE INTERIORS</div>
            <div className="logo-caption">Crafting Beautiful Spaces</div>
          </div>
        </a>

        <nav className={`vrb-nav-links${open ? ' open' : ''}`}>
          <ul>
            {links.map(l => (
              <li key={l}>
                <a href={`#${l.toLowerCase()}`} className={l === 'Home' ? 'active' : ''} onClick={() => setOpen(false)}>
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="vrb-nav-actions" style={{ display: 'flex' }}>
          <a href="#contact" className="vrb-btn-nav" style={{ cursor: 'pointer' }}>Book Consultation</a>
        </div>

        <button className="vrb-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
}
