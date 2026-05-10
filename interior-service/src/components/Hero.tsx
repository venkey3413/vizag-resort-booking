import { useState } from 'react';

const STYLES = ['Modern', 'Classic', 'Minimalist', 'Luxury', 'Scandinavian'];

export default function Hero() {
  const [activeStyle, setActiveStyle] = useState('Modern');

  return (
    <section
      id="home"
      className="vrb-hero"
      style={{
        backgroundImage: `url("https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1800")`,
        minHeight: '100vh',
      }}
    >
      <div className="vrb-overlay" />
      <div className="vrb-hero-content">
        <h1 style={{ fontSize: 56, lineHeight: 1.1 }}>
          Transform Your Space Into<br />
          <span style={{ color: '#ff9a3c' }}>A Living Masterpiece</span>
        </h1>
        <p>Award-winning interior design studio crafting bespoke spaces that inspire, comfort, and captivate.</p>

        <div className="vrb-tabs">
          {STYLES.map(s => (
            <button
              key={s}
              className={`vrb-tab-btn${activeStyle === s ? ' active' : ''}`}
              onClick={() => setActiveStyle(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="vrb-search-box" style={{ gridTemplateColumns: '1.5fr 1fr 1fr auto', marginTop: 24 }}>
          <div className="vrb-field">
            <label>Project Type</label>
            <select>
              <option>Residential Interior</option>
              <option>Commercial Space</option>
              <option>Hospitality Design</option>
              <option>Office Design</option>
            </select>
          </div>
          <div className="vrb-field">
            <label>Budget Range</label>
            <select>
              <option>$10K – $50K</option>
              <option>$50K – $150K</option>
              <option>$150K – $500K</option>
              <option>$500K+</option>
            </select>
          </div>
          <div className="vrb-field">
            <label>Timeline</label>
            <select>
              <option>1–3 Months</option>
              <option>3–6 Months</option>
              <option>6–12 Months</option>
              <option>12+ Months</option>
            </select>
          </div>
          <button className="vrb-btn vrb-btn-orange" style={{ whiteSpace: 'nowrap' }}>
            Get Free Quote →
          </button>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[['500+', 'Projects Done'], ['15+', 'Years Experience'], ['98%', 'Client Satisfaction'], ['50+', 'Awards Won']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#ff9a3c' }}>{n}</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
