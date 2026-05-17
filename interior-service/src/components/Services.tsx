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
    <section id="services" style={{ padding: '60px 7%', background: '#f8f4ef', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: 'auto' }}>
        <span style={{ 
          display: 'block', 
          textAlign: 'center', 
          color: '#a06f4b', 
          letterSpacing: '3px', 
          fontSize: '12px', 
          marginBottom: '12px', 
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          WHAT WE DO
        </span>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '42px', 
          color: '#2f1d14', 
          marginBottom: '16px', 
          fontFamily: 'Playfair Display, serif',
          fontWeight: 700,
          letterSpacing: '-1px'
        }}>
          Our Design Services
        </h2>
        <p style={{ 
          textAlign: 'center', 
          maxWidth: '650px', 
          margin: 'auto', 
          color: '#666', 
          lineHeight: 1.7, 
          marginBottom: '50px',
          fontSize: '15px',
          fontWeight: 400
        }}>
          End-to-end interior solutions tailored to your vision and lifestyle.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '25px' }}>
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
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
              />
              <div style={{ padding: '24px', position: 'relative' }}>
                <div style={{
                  width: '55px',
                  height: '55px',
                  background: '#b48969',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  position: 'absolute',
                  top: '-27px',
                  left: '24px',
                  border: '4px solid #fff',
                }}>
                  {s.icon}
                </div>
                <h3 style={{ 
                  marginTop: '20px', 
                  fontSize: '22px', 
                  color: '#2f1d14', 
                  marginBottom: '12px', 
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 700,
                  letterSpacing: '-0.5px'
                }}>
                  {s.title}
                </h3>
                <p style={{ 
                  color: '#666', 
                  lineHeight: 1.7, 
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: 400
                }}>
                  {s.desc}
                </p>
                <a href="#contact" style={{ 
                  textDecoration: 'none', 
                  color: '#a06f4b', 
                  fontWeight: 700,
                  fontSize: '15px',
                  letterSpacing: '0.5px'
                }}>
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
