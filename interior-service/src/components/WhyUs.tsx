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

export default function WhyUs() {
  return (
    <section id="about" className="vrb-soft-bg">
      <div className="vrb-premium-area">
        <div className="vrb-wrap vrb-anim">
          <h2 className="vrb-heading">Why Choose Interiors?</h2>
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
      </div>
    </section>
  );
}
