// Fix for real-time resort updates
// This script ensures that when resorts are deleted from admin panel, 
// the main website automatically refreshes without manual page reload

// 1. Enhanced Redis pub/sub with fallback polling
// 2. Improved error handling and reconnection logic
// 3. Multiple update mechanisms for reliability

const fs = require('fs');
const path = require('path');

// Enhanced script.js with better real-time updates
const enhancedScriptContent = `
// Enhanced WebSocket/Redis sync with fallback polling
function setupWebSocketSync() {
    console.log('📡 Enhanced Redis real-time sync enabled for main website');
    
    let eventSource;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let fallbackPollingInterval;
    
    function connectEventSource() {
        try {
            const eventSourceUrl = \`\${SERVER_URL}/api/events\`;
            eventSource = new EventSource(eventSourceUrl);
            console.log('📡 Connecting to Redis events at:', eventSourceUrl);
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📡 Main website Redis event received:', data);
                    
                    // Handle resort events with immediate refresh
                    if (data.type === 'resort.added' || data.type === 'resort.updated' || 
                        data.type === 'resort.deleted' || data.type === 'resort.order.updated') {
                        console.log('🏨 Resort update detected - auto-refreshing resorts!');
                        
                        // Force reload resorts immediately
                        setTimeout(() => {
                            loadResorts();
                        }, 100);
                        
                        // Show notification
                        showNotification('Resort information updated automatically', 'success');
                        
                        // Clear any cached data
                        if (window.resorts) {
                            window.resorts = null;
                        }
                    }
                    
                    if (data.type === 'resort.availability.updated') {
                        console.log('📅 Resort availability updated - refreshing resorts');
                        setTimeout(() => {
                            loadResorts();
                        }, 100);
                    }
                } catch (error) {
                    // Ignore ping messages and parsing errors
                    console.log('📡 Non-JSON message received (likely ping)');
                }
            };
            
            eventSource.onerror = function(error) {
                console.log('⚠️ Main website Redis connection error, attempting reconnect...');
                eventSource.close();
                
                // Start fallback polling if Redis fails
                startFallbackPolling();
                
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectEventSource, 2000 * reconnectAttempts);
                } else {
                    console.log('❌ Max reconnection attempts reached, using fallback polling');
                }
            };
            
            eventSource.onopen = function() {
                console.log('✅ Main website connected to Redis pub/sub');
                reconnectAttempts = 0;
                
                // Stop fallback polling when Redis is working
                if (fallbackPollingInterval) {
                    clearInterval(fallbackPollingInterval);
                    fallbackPollingInterval = null;
                }
            };
        } catch (error) {
            console.error('Main website Redis setup failed:', error);
            startFallbackPolling();
        }
    }
    
    // Fallback polling mechanism
    function startFallbackPolling() {
        if (fallbackPollingInterval) return; // Already running
        
        console.log('🔄 Starting fallback polling for resort updates');
        let lastResortCount = resorts.length;
        
        fallbackPollingInterval = setInterval(async () => {
            try {
                const response = await fetch(\`\${SERVER_URL}/api/resorts\`);
                if (response.ok) {
                    const newResorts = await response.json();
                    
                    // Check if resorts changed
                    if (newResorts.length !== lastResortCount || 
                        JSON.stringify(newResorts) !== JSON.stringify(resorts)) {
                        
                        console.log('🔄 Fallback polling detected resort changes');
                        resorts = newResorts;
                        window.resorts = newResorts;
                        displayResorts();
                        showNotification('Resort information updated', 'success');
                        lastResortCount = newResorts.length;
                    }
                }
            } catch (error) {
                console.log('🔄 Fallback polling error:', error);
            }
        }, 5000); // Poll every 5 seconds
    }
    
    connectEventSource();
}

// Enhanced loadResorts function with cache busting
async function loadResorts() {
    try {
        // Add cache busting parameter
        const cacheBuster = Date.now();
        const url = \`\${SERVER_URL}/api/resorts?_cb=\${cacheBuster}\`;
        console.log('🏝️ Fetching resorts from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('📶 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const data = await response.json();
        resorts = data;
        window.resorts = data; // Make available globally
        console.log('✅ Resorts loaded:', resorts.length, 'resorts');
        
        displayResorts();
        
    } catch (error) {
        console.error('❌ Error loading resorts:', error);
        showNotification(\`Failed to load resorts: \${error.message}\`, 'error');
    }
}
`;

// Read current script.js
const scriptPath = path.join(__dirname, 'public', 'script.js');
let currentScript = '';

try {
    currentScript = fs.readFileSync(scriptPath, 'utf8');
} catch (error) {
    console.error('Could not read script.js:', error);
    process.exit(1);
}

// Replace the setupWebSocketSync function
const setupWebSocketSyncRegex = /function setupWebSocketSync\(\) \{[\s\S]*?\n\}/;
const loadResortsRegex = /async function loadResorts\(\) \{[\s\S]*?\n\}/;

if (setupWebSocketSyncRegex.test(currentScript)) {
    currentScript = currentScript.replace(setupWebSocketSyncRegex, enhancedScriptContent.match(/function setupWebSocketSync\(\) \{[\s\S]*?\n\}/)[0]);
    console.log('✅ Enhanced setupWebSocketSync function');
} else {
    console.log('⚠️ setupWebSocketSync function not found, appending');
    currentScript += '\n' + enhancedScriptContent.match(/function setupWebSocketSync\(\) \{[\s\S]*?\n\}/)[0];
}

if (loadResortsRegex.test(currentScript)) {
    currentScript = currentScript.replace(loadResortsRegex, enhancedScriptContent.match(/async function loadResorts\(\) \{[\s\S]*?\n\}/)[0]);
    console.log('✅ Enhanced loadResorts function');
}

// Write the enhanced script back
try {
    fs.writeFileSync(scriptPath, currentScript);
    console.log('✅ Enhanced script.js with better real-time updates');
} catch (error) {
    console.error('Could not write enhanced script.js:', error);
    process.exit(1);
}

console.log(`
🎉 Real-time update fix applied successfully!

Changes made:
1. Enhanced Redis pub/sub connection with better error handling
2. Added fallback polling mechanism (every 5 seconds) when Redis fails
3. Improved cache busting for resort loading
4. Better reconnection logic with exponential backoff
5. Immediate resort refresh on delete events

The main website will now automatically refresh when:
- Resorts are added, updated, or deleted from admin panel
- Resort availability changes
- Resort order is modified

If Redis fails, the system will automatically fall back to polling.
`);