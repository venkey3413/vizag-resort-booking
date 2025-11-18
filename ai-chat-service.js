const { spawn } = require('child_process');
const path = require('path');

class AIChatService {
    constructor() {
        this.pythonProcess = null;
        this.initPythonService();
    }

    initPythonService() {
        const chatAppPath = path.join(__dirname, 'chat-app');
        this.pythonProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8001'], {
            cwd: chatAppPath,
            stdio: 'pipe'
        });

        this.pythonProcess.stdout.on('data', (data) => {
            console.log(`🤖 AI Chat: ${data}`);
        });

        this.pythonProcess.stderr.on('data', (data) => {
            console.error(`🤖 AI Chat Error: ${data}`);
        });
    }

    async queryAI(message, sessionId = 'default') {
        try {
            const response = await fetch('http://127.0.0.1:8001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message })
            });

            if (!response.ok) {
                throw new Error(`AI service error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('AI service error:', error);
            return { 
                answer: "I'm having trouble connecting to the AI service. Please try again.", 
                handover: true 
            };
        }
    }

    cleanup() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
    }
}

module.exports = AIChatService;