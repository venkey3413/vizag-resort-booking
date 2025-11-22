const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class AIChatService {
    constructor() {
        this.pythonProcess = null;
        this.isAvailable = false;
        this.initPythonService();
    }

    initPythonService() {
        try {
            // Check if Python is available
            const testProcess = spawn('python', ['--version'], { stdio: 'pipe' });
            
            testProcess.on('error', (error) => {
                console.log('🤖 AI Chat: Python not available, AI features disabled');
                this.isAvailable = false;
                return;
            });
            
            testProcess.on('close', (code) => {
                if (code === 0) {
                    this.startPythonService();
                } else {
                    console.log('🤖 AI Chat: Python not working properly, AI features disabled');
                    this.isAvailable = false;
                }
            });
        } catch (error) {
            console.log('🤖 AI Chat: Failed to initialize, AI features disabled');
            this.isAvailable = false;
        }
    }
    
    startPythonService() {
        try {
            const chatAppPath = path.join(__dirname, 'chat-app');
            
            // Check if chat-app directory exists
            if (!fs.existsSync(chatAppPath)) {
                console.log('🤖 AI Chat: chat-app directory not found, AI features disabled');
                this.isAvailable = false;
                return;
            }
            
            this.pythonProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8001'], {
                cwd: chatAppPath,
                stdio: 'pipe'
            });

            this.pythonProcess.stdout.on('data', (data) => {
                console.log(`🤖 AI Chat: ${data}`);
                this.isAvailable = true;
            });

            this.pythonProcess.stderr.on('data', (data) => {
                console.error(`🤖 AI Chat Error: ${data}`);
            });
            
            this.pythonProcess.on('error', (error) => {
                console.log('🤖 AI Chat: Service failed to start, AI features disabled');
                this.isAvailable = false;
            });
        } catch (error) {
            console.log('🤖 AI Chat: Failed to start service, AI features disabled');
            this.isAvailable = false;
        }
    }

    async queryAI(message, sessionId = 'default') {
        if (!this.isAvailable) {
            return { 
                answer: "AI chat service is currently unavailable. Please contact support for assistance.", 
                handover: true 
            };
        }
        
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
            this.isAvailable = false;
            return { 
                answer: "I'm having trouble connecting to the AI service. Please try again later.", 
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