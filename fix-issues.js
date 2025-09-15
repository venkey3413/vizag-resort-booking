const fs = require('fs');

// Fix HTML encoding issues
function fixHtmlFiles() {
    const files = [
        'public/index.html',
        'admin-public/index.html', 
        'booking-public/index.html'
    ];
    
    files.forEach(file => {
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, 'utf8');
            
            // Replace Unicode rupee symbols with HTML entities
            content = content.replace(/₹/g, '&#8377;');
            
            // Fix any malformed entities
            content = content.replace(/&([a-zA-Z0-9#]+)(?!;)/g, '&$1;');
            
            // Remove any BOM
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }
            
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Fixed: ${file}`);
        }
    });
}

// Fix JavaScript validation issues
function fixBookingValidation() {
    const scriptFile = 'public/script.js';
    if (fs.existsSync(scriptFile)) {
        let content = fs.readFileSync(scriptFile, 'utf8');
        
        // Fix phone validation to ensure only digits are sent
        const phoneValidationFix = `
    // Validation
    const phoneInput = document.getElementById('phone').value.trim();
    // Remove any non-digit characters and validate
    const cleanPhone = phoneInput.replace(/[^0-9]/g, '');
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
        showNotification('Please enter a valid 10-digit mobile number', 'error');
        return;
    }`;
        
        content = content.replace(
            /\/\/ Validation\s+const phoneInput[^}]+}/,
            phoneValidationFix
        );
        
        // Fix booking data to send clean phone
        content = content.replace(
            /phone: phoneInput,/g,
            'phone: cleanPhone,'
        );
        
        // Add better error handling for booking
        const betterErrorHandling = `
        } else {
            let errorMsg = 'Please try again';
            try {
                const errorText = await response.text();
                console.log('Server response:', errorText);
                try {
                    const error = JSON.parse(errorText);
                    errorMsg = error.error || errorMsg;
                } catch (parseErr) {
                    errorMsg = 'Server error: ' + response.status + ' - ' + errorText.substring(0, 100);
                }
            } catch (err) {
                errorMsg = 'Booking failed: ' + response.status;
            }
            showNotification('Booking failed: ' + errorMsg, 'error');
        }`;
        
        content = content.replace(
            /} else {\s+let errorMsg[^}]+}/,
            betterErrorHandling
        );
        
        fs.writeFileSync(scriptFile, content, 'utf8');
        console.log('Fixed: public/script.js');
    }
}

// Fix server validation
function fixServerValidation() {
    const serverFile = 'server.js';
    if (fs.existsSync(serverFile)) {
        let content = fs.readFileSync(serverFile, 'utf8');
        
        // Add better request logging
        const loggingFix = `
app.post('/api/bookings', async (req, res) => {
    console.log('Booking request received:', {
        resortId: req.body.resortId,
        guestName: req.body.guestName,
        email: req.body.email,
        phone: req.body.phone,
        checkIn: req.body.checkIn,
        checkOut: req.body.checkOut,
        guests: req.body.guests
    });
    
    // Validate required fields
    const { resortId, guestName, email, phone, checkIn, checkOut, guests, paymentId } = req.body;
    
    if (!resortId || !guestName || !email || !phone || !checkIn || !checkOut || !guests) {
        console.log('Missing required fields:', { resortId, guestName, email, phone, checkIn, checkOut, guests });
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate phone format (should be 10 digits)
    const cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
        console.log('Invalid phone format:', phone);
        return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('Invalid email format:', email);
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        console.log('Invalid date format:', { checkIn, checkOut });
        return res.status(400).json({ error: 'Invalid date format' });
    }
    
    if (checkInDate >= checkOutDate) {
        console.log('Invalid date range:', { checkIn, checkOut });
        return res.status(400).json({ error: 'Check-out must be after check-in' });
    }
    
    try {`;
        
        content = content.replace(
            /app\.post\('\/api\/bookings', async \(req, res\) => {\s+console\.log\('Booking request received:', req\.body\);\s+try {/,
            loggingFix
        );
        
        fs.writeFileSync(serverFile, content, 'utf8');
        console.log('Fixed: server.js');
    }
}

console.log('Starting fixes...');
fixHtmlFiles();
fixBookingValidation();
fixServerValidation();
console.log('All fixes applied!');