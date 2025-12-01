// Empty EventBridge listener module
// This is a placeholder to prevent require errors

module.exports = {
    subscribe: (clientId, res, type) => {
        console.log(`EventBridge listener subscription: ${clientId} (${type})`);
        // Send empty response to prevent hanging
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('data: {"type":"connected"}\n\n');
    },
    
    handleEvent: (eventType, source, data) => {
        console.log(`EventBridge event: ${eventType} from ${source}`, data);
        // Empty handler
    }
};