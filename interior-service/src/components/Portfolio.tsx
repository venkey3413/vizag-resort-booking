import { useState } from 'react';

const CATEGORIES = ['All Projects', 'Residential', 'Commercial', 'Luxury', 'Hospitality'];

const PROJECTS = [
  {
    title: 'The Serenity Villa',
    location: 'Beverly Hills, CA',
    category: 'Residential',
    tags: ['Luxury', 'Modern', 'Living'],
    img: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    title: 'Executive Workspace',
    location: 'Chicago, IL',
    category: 'Commercial',
    tags: ['Office', 'Branding', 'Luxury'],
    img: 'https://images.pexels.com/photos/380768/pexels-photo-380768.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    title: 'Skyline Penthouse',
    location: 'Manhattan, NY',
    category: 'Luxury',
    tags: ['Bedroom', 'Premium', 'Warm'],
    img: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState('All Projects');

  return (
    <section id="portfolio" style={{ padding: '100px 7%', background: '#f8f4ef', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ maxWidth: '1350px', margin: 'auto' }}>
        <span style={{ display: 'block', textAlign: 'center', color: '#a06f4b', letterSpacing: '3px', fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>
          OUR PORTFOLIO
        </span>
        <h2 style={{ textAlign: 'center', fontSize: '56px', marginBottom: '18px', color: '#2f1d14', fontFamily: 'Playfair Display, serif' }}>
          Spaces We've Transformed
        </h2>
        <p style={{ textAlign: 'center', maxWidth: '700px', margin: 'auto', color: '#666', lineHeight: 1.8, marginBottom: '45px' }}>
          Explore our curated collection of luxury interior projects.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', margin: '45px 0 60px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                border: 'none',
                padding: '14px 28px',
                borderRadius: '40px',
                background: activeTab === cat ? '#a06f4b' : '#fff',
                color: activeTab === cat ? 'white' : '#000',
                cursor: 'pointer',
                fontWeight: 600,
                transition: '.3s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== cat) {
                  e.currentTarget.style.background = '#a06f4b';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== cat) {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.color = '#000';
                }
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: '35px' }}>
          {PROJECTS.map((project, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                borderRadius: '26px',
                overflow: 'hidden',
                transition: '.4s',
                boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={project.img}
                  alt={project.title}
                  style={{ width: '100%', height: '270px', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(76,50,35,.9)',
                  color: 'white',
                  padding: '10px 18px',
                  borderRadius: '30px',
                  fontSize: '13px',
                }}>
                  {project.category}
                </span>
              </div>

              <div style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '30px', marginBottom: '10px', color: '#2f1d14', fontFamily: 'Playfair Display, serif' }}>
                  {project.title}
                </h3>
                <p style={{ color: '#777', marginBottom: '18px' }}>
                  {project.location}
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
                  {project.tags.map((tag) => (
                    <span key={tag} style={{
                      background: '#f3ebe4',
                      color: '#8b5e3c',
                      padding: '8px 14px',
                      borderRadius: '30px',
                      fontSize: '13px',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <a href="#contact" style={{ color: '#a06f4b', textDecoration: 'none', fontWeight: 600 }}>
                  View Case Study →
                </a>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <a
            href="#contact"
            style={{
              background: '#a06f4b',
              color: 'white',
              padding: '18px 40px',
              borderRadius: '50px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: 600,
              transition: '.3s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            View All Projects →
          </a>
        </div>
      </div>
    </section>
  );
}
