const fs = require('fs');
const path = require('path');
const Database = require('sqlite3').Database;

// Generate sitemap with resort URLs
function generateSitemap() {
    const db = new Database('./resort_booking.db');
    
    db.all('SELECT id, name, location FROM resorts WHERE available = 1 ORDER BY sort_order', (err, resorts) => {
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
        
        // Add each resort as a separate URL
        resorts.forEach(resort => {
            const resortUrl = `${baseUrl}#resort-${resort.id}`;
            sitemap += `
    <url>
        <loc>${resortUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });
        
        sitemap += `
</urlset>`;
        
        // Write sitemap to public directory
        fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);
        console.log('✅ Sitemap generated with', resorts.length, 'resorts');
        
        db.close();
    });
}

// Run if called directly
if (require.main === module) {
    generateSitemap();
}

module.exports = { generateSitemap };