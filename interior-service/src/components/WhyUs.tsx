const FEATURES = [
  {
    icon: '🎨',
    title: 'Bespoke Designs',
    desc: 'Every project is uniquely tailored to your personality, lifestyle, and space requirements. No cookie-cutter templates.',
  },
  {
    icon: '🏆',
    title: 'Award-Winning Studio',
    desc: 'Recognized by AD100, Elle Décor, and Architectural Digest for transformative design excellence.',
  },
  {
    icon: '💡',
    title: 'Smart Home Integration',
    desc: 'Seamless integration of smart lighting, climate, and security into beautiful, functional designs.',
  },
  {
    icon: '🔄',
    title: 'Full Project Management',
    desc: 'From concept to completion — we handle procurement, contractors, and every detail in between.',
  },
  {
    icon: '🌱',
    title: 'Sustainable Design',
    desc: 'Eco-conscious materials and energy-efficient solutions without compromising on luxury or style.',
  },
  {
    icon: '📐',
    title: 'Precision & Craftsmanship',
    desc: 'Meticulous attention to detail in every corner, joint, and finish — because perfection matters.',
  },
];

const LOCATIONS = [
  {
    icon: '🏙️',
    name: 'New York City',
    desc: 'Our flagship studio in Manhattan serves luxury residential and commercial clients across the tri-state area.',
    highlight: true,
  },
  {
    icon: '🌴',
    name: 'Los Angeles',
    desc: 'Hollywood Hills estates, Malibu beach homes, and Beverly Hills penthouses — we define LA luxury living.',
    highlight: false,
  },
  {
    icon: '🗼',
    name: 'International Projects',
    desc: 'From London townhouses to Dubai sky villas — our global team delivers world-class design anywhere.',
    highlight: true,
  },
];

export default function WhyUs() {
  return (
    <section id="about" className="vrb-soft-bg">
      <div className="vrb-premium-area">
        <div className="vrb-wrap vrb-anim">
          <h2 className="vrb-heading">Why Choose Luxe Interiors?</h2>
          <p className="vrb-desc">We don't just design rooms — we craft experiences that reflect who you are.</p>

          <div className="vrb-feature-grid">
            {FEATURES.map((f, i) => (
              <div className="vrb-feature-card vrb-anim" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="vrb-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="vrb-wrap vrb-anim">
          <h2 className="vrb-heading">Where We Work</h2>
          <p className="vrb-desc">Serving discerning clients across the globe with studios in key design capitals.</p>

          <div className="vrb-location-grid">
            {LOCATIONS.map((l, i) => (
              <div className={`vrb-location-card${l.highlight ? ' vrb-location-highlight' : ''} vrb-anim`} key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <h3>{l.icon} {l.name}</h3>
                <p>{l.desc}</p>
                <button className="vrb-mini-btn">Explore Projects →</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
