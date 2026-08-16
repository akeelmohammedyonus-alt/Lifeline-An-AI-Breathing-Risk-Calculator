import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

function getAiProvider() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        return 'openai';
    }

    const envText = fs.readFileSync(envPath, 'utf8');
    const match = envText.match(/^AI_PROVIDER\s*=\s*(.+)$/m);
    return (match ? match[1].trim().toLowerCase() : 'openai');
}

function killOllama() {
    try {
        if (process.platform === 'win32') {
            spawnSync('taskkill', ['/F', '/IM', 'ollama.exe'], { stdio: 'ignore' });
        } else {
            spawnSync('pkill', ['-f', 'ollama'], { stdio: 'ignore' });
        }
    } catch (error) {
        // Ignore if Ollama is already stopped.
    }
}

function stopPort(port) {
    try {
        execSync(`npx kill-port ${port}`, { stdio: 'inherit' });
    } catch (error) {
        // Ignore if the port is already free.
    }
}

const provider = getAiProvider();

if (provider === 'ollama') {
    killOllama();
}

stopPort(3000);
