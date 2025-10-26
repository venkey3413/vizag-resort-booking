const fs = require('fs');
const path = require('path');
const Database = require('sqlite3').Database;

// Generate comprehensive sitemap with resort URLs and location pages
function generateSitemap() {
    const db = new Database('./resort_booking.db');
    
    db.all('SELECT id, name, location FROM resorts WHERE available = 1 ORDER BY id', (err, resorts) => {
        if (err) {
            console.error('Error fetching resorts:', err);
            return;
        }
        
        const baseUrl = 'https://vizagresortbooking.in';
        const currentDate = new Date().toISOString().split('T')[0];
        
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;
        
        // Add main service pages
        const servicePages = [
            { url: `${baseUrl}/food`, priority: '0.7', changefreq: 'weekly' },
            { url: `${baseUrl}/travel`, priority: '0.7', changefreq: 'weekly' },
            { url: `${baseUrl}/owner-dashboard`, priority: '0.5', changefreq: 'monthly' }
        ];
        
        servicePages.forEach(page => {
            sitemap += `
    <url>
        <loc>${page.url}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`;
        });
        
        // Add location-based landing pages
        const locations = [
            'S.R Puram', 'S Kota', 'Narava', 'Pinagadi', 'Pendurthi', 
            'RK Beach', 'Rushikonda', 'Yarada Beach', 'Araku', 'Lambasingi'
        ];
        
        locations.forEach(location => {
            const locationSlug = location.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const locationUrl = `${baseUrl}?location=${encodeURIComponent(location)}`;
            sitemap += `
    <url>
        <loc>${locationUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });
        
        // Add keyword-based landing pages
        const keywordPages = [
            'book-resorts-vizag',
            'best-resorts-visakhapatnam', 
            'private-pool-resorts-vizag',
            'beach-resorts-vizag',
            'family-resorts-vizag',
            'luxury-resorts-vizag',
            'weekend-resorts-vizag',
            'corporate-resorts-vizag',
            'budget-resorts-vizag',
            'hill-station-resorts-vizag'
        ];
        
        keywordPages.forEach(keyword => {
            const keywordUrl = `${baseUrl}?category=${keyword}`;
            sitemap += `
    <url>
        <loc>${keywordUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`;
        });
        
        // Add each resort as a separate URL with better structure
        resorts.forEach(resort => {
            const resortSlug = resort.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const resortUrl = `${baseUrl}?resort=${resort.id}&name=${resortSlug}`;
            sitemap += `
    <url>
        <loc>${resortUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>`;
            
            // Add resort with location combination
            const locationSlug = resort.location.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const resortLocationUrl = `${baseUrl}?resort=${resort.id}&location=${locationSlug}`;
            sitemap += `
    <url>
        <loc>${resortLocationUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });
        
        sitemap += `
</urlset>`;
        
        // Write sitemap to public directory
        fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);
        console.log('✅ Comprehensive sitemap generated with', resorts.length, 'resorts and', (servicePages.length + locations.length + keywordPages.length), 'additional pages');
        
        db.close();
    });
}

// Generate robots.txt file
function generateRobotsTxt() {
    const robotsContent = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: https://vizagresortbooking.in/sitemap.xml

# Disallow admin areas
Disallow: /owner-dashboard/
Disallow: /booking-management/
Disallow: /admin/

# Allow important pages
Allow: /food/
Allow: /travel/
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.gif
Allow: /*.webp`;
    
    fs.writeFileSync(path.join(__dirname, 'public', 'robots.txt'), robotsContent);
    console.log('✅ Robots.txt generated');
}

// Run if called directly
if (require.main === module) {
    generateSitemap();
    generateRobotsTxt();
}

module.exports = { generateSitemap, generateRobotsTxt };