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
    <section id="portfolio" style={{ padding: '60px 7%', background: '#f8f4ef', fontFamily: 'Poppins, sans-serif' }}>
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
          OUR PORTFOLIO
        </span>
        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '42px', 
          marginBottom: '16px', 
          color: '#2f1d14', 
          fontFamily: 'Playfair Display, serif',
          fontWeight: 700,
          letterSpacing: '-1px'
        }}>
          Spaces We've Transformed
        </h2>
        <p style={{ 
          textAlign: 'center', 
          maxWidth: '650px', 
          margin: 'auto', 
          color: '#666', 
          lineHeight: 1.7, 
          marginBottom: '40px',
          fontSize: '15px',
          fontWeight: 400
        }}>
          Explore our curated collection of luxury interior projects.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', margin: '40px 0 50px' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                border: 'none',
                padding: '12px 24px',
                borderRadius: '40px',
                background: activeTab === cat ? '#a06f4b' : '#fff',
                color: activeTab === cat ? 'white' : '#000',
                cursor: 'pointer',
                fontWeight: 600,
                transition: '.3s',
                fontSize: '14px'
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: '25px' }}>
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
                  style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(76,50,35,.9)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '30px',
                  fontSize: '12px',
                }}>
                  {project.category}
                </span>
              </div>

              <div style={{ padding: '24px' }}>
                <h3 style={{ 
                  fontSize: '24px', 
                  marginBottom: '8px', 
                  color: '#2f1d14', 
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 700,
                  letterSpacing: '-0.5px'
                }}>
                  {project.title}
                </h3>
                <p style={{ 
                  color: '#777', 
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: 500
                }}>
                  {project.location}
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {project.tags.map((tag) => (
                    <span key={tag} style={{
                      background: '#f3ebe4',
                      color: '#8b5e3c',
                      padding: '6px 12px',
                      borderRadius: '30px',
                      fontSize: '12px',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <a href="#contact" style={{ 
                  color: '#a06f4b', 
                  textDecoration: 'none', 
                  fontWeight: 700,
                  fontSize: '15px',
                  letterSpacing: '0.5px'
                }}>
                  View Case Study →
                </a>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <a
            href="#contact"
            style={{
              background: '#a06f4b',
              color: 'white',
              padding: '14px 36px',
              borderRadius: '50px',
              textDecoration: 'none',
              display: 'inline-block',
              fontWeight: 600,
              transition: '.3s',
              fontSize: '15px'
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
