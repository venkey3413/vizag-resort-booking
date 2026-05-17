const SERVICES = [
  {
    icon: '🛋️',
    title: 'Living Room Design',
    desc: 'Curated furniture, lighting and layouts to create elegant spaces.',
    img: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    icon: '🍽️',
    title: 'Kitchen & Dining',
    desc: 'Functional kitchens with premium aesthetics and smart layouts.',
    img: 'https://images.pexels.com/photos/2062426/pexels-photo-2062426.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    icon: '🛏️',
    title: 'Bedroom Sanctuary',
    desc: 'Peaceful bedrooms with soft textures and warm lighting.',
    img: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    icon: '🏢',
    title: 'Commercial Spaces',
    desc: 'Professional interiors designed for productivity and branding.',
    img: 'https://images.pexels.com/photos/380768/pexels-photo-380768.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

export default function Services() {
  return (
    <section id="services" style={{ padding: '90px 7%', background: '#f8f4ef', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ maxWidth: '1350px', margin: 'auto' }}>
        <span style={{ display: 'block', textAlign: 'center', color: '#a06f4b', letterSpacing: '3px', fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>
          WHAT WE DO
        </span>
        <h2 style={{ textAlign: 'center', fontSize: '52px', color: '#2f1d14', marginBottom: '15px', fontFamily: 'Playfair Display, serif' }}>
          Our Design Services
        </h2>
        <p style={{ textAlign: 'center', maxWidth: '700px', margin: 'auto', color: '#666', lineHeight: 1.8, marginBottom: '60px' }}>
          End-to-end interior solutions tailored to your vision and lifestyle.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '30px' }}>
          {SERVICES.map((s, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: '24px',
                overflow: 'hidden',
                transition: '.4s ease',
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <img
                src={s.img}
                alt={s.title}
                style={{ width: '100%', height: '240px', objectFit: 'cover' }}
              />
              <div style={{ padding: '28px', position: 'relative' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: '#b48969',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  position: 'absolute',
                  top: '-30px',
                  left: '28px',
                  border: '5px solid #fff',
                }}>
                  {s.icon}
                </div>
                <h3 style={{ marginTop: '20px', fontSize: '28px', color: '#2f1d14', marginBottom: '15px', fontFamily: 'Playfair Display, serif' }}>
                  {s.title}
                </h3>
                <p style={{ color: '#666', lineHeight: 1.8, marginBottom: '25px' }}>
                  {s.desc}
                </p>
                <a href="#contact" style={{ textDecoration: 'none', color: '#a06f4b', fontWeight: 600 }}>
                  Learn More →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
