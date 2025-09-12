// Image optimization utilities

// Compress image before upload (client-side)
function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calculate new dimensions
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Generate responsive image URLs (if using CDN)
function getResponsiveImageUrl(originalUrl, width) {
    // For S3 or CDN with image processing
    if (originalUrl.includes('s3.amazonaws.com')) {
        // Add width parameter for responsive images
        return originalUrl + `?w=${width}&q=80&f=auto`;
    }
    return originalUrl;
}

// Preload critical images
function preloadCriticalImages() {
    const criticalImages = document.querySelectorAll('.resort-image.active');
    criticalImages.forEach(img => {
        if (img.dataset.src) {
            img.src = img.dataset.src;
        }
    });
}

// Progressive image loading
function setupProgressiveLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// WebP support detection
function supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// Auto-convert images to WebP if supported
function optimizeImageFormat(imageUrl) {
    if (supportsWebP() && !imageUrl.includes('.webp')) {
        // Replace extension with .webp if CDN supports it
        return imageUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return imageUrl;
}

// Initialize image optimization
document.addEventListener('DOMContentLoaded', function() {
    preloadCriticalImages();
    setupProgressiveLoading();
});