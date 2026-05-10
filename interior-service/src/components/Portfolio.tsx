import { useState } from 'react';

const FILTERS = ['All', 'Residential', 'Commercial', 'Luxury', 'Minimalist'];

const PROJECTS = [
  {
    img: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'The Serenity Villa',
    meta: 'Beverly Hills, CA · Residential',
    badge: 'Featured',
    cat: 'Residential',
    tags: ['Living Room', 'Luxury', 'Modern'],
  },
  {
    img: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Skyline Penthouse',
    meta: 'Manhattan, NY · Luxury',
    badge: 'Award Winning',
    cat: 'Luxury',
    tags: ['Bedroom', 'Penthouse', 'Panoramic'],
  },
  {
    img: 'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Nordic Minimalist Loft',
    meta: 'Stockholm, Sweden · Minimalist',
    badge: 'Trending',
    cat: 'Minimalist',
    tags: ['Scandi', 'Open Plan', 'Natural Light'],
  },
  {
    img: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'The Executive Suite',
    meta: 'Chicago, IL · Commercial',
    badge: 'Corporate',
    cat: 'Commercial',
    tags: ['Office', 'Executive', 'Branding'],
  },
  {
    img: 'https://images.pexels.com/photos/2082087/pexels-photo-2082087.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Coastal Dream Home',
    meta: 'Malibu, CA · Residential',
    badge: 'New',
    cat: 'Residential',
    tags: ['Coastal', 'Airy', 'Open'],
  },
  {
    img: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=600',
    title: 'Art Deco Revival',
    meta: 'Paris, France · Luxury',
    badge: 'Classic',
    cat: 'Luxury',
    tags: ['Art Deco', 'Gold', 'Heritage'],
  },
];

export default function Portfolio() {
  const [active, setActive] = useState('All');

  const filtered = active === 'All' ? PROJECTS : PROJECTS.filter(p => p.cat === active);

  return (
    <section id="portfolio" style={{ padding: '100px 0', background: '#0f172a' }}>
      <div className="vrb-container">
        <div className="vrb-section-head vrb-anim" style={{ marginBottom: 40 }}>
          <div className="vrb-title" style={{ color: '#fff', background: 'linear-gradient(135deg,#fff,#ff9a3c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Our Portfolio
          </div>
          <p className="vrb-subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>Explore our curated collection of transformative design projects</p>
        </div>

        <div className="vrb-filters">
          {FILTERS.map(f => (
            <button key={f} className={`vrb-chip${active === f ? ' active' : ''}`} onClick={() => setActive(f)}>
              {f}
            </button>
          ))}
        </div>

        <div className="vrb-grid">
          {filtered.map((p, i) => (
            <div className="vrb-card vrb-anim" key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="vrb-img">
                <img src={p.img} alt={p.title} />
                <div className="vrb-badge">{p.badge}</div>
              </div>
              <div className="vrb-body">
                <h3 style={{ color: '#fff' }}>{p.title}</h3>
                <p className="vrb-meta" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.meta}</p>
                <div className="vrb-tags">
                  {p.tags.map(t => (
                    <span key={t} style={{ background: 'rgba(255,154,60,0.15)', color: '#ff9a3c', borderColor: 'rgba(255,154,60,0.3)' }}>{t}</span>
                  ))}
                </div>
                <div className="vrb-bottom">
                  <div className="vrb-small" style={{ color: '#ff9a3c' }}>View Case Study →</div>
                  <button className="vrb-btn-primary">Explore</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <button className="vrb-btn vrb-btn-orange" style={{ padding: '16px 40px', fontSize: 16 }}>
            View All 500+ Projects →
          </button>
        </div>
      </div>
    </section>
  );
}
