import fs from 'fs';
import path from 'path';

const SOURCE_FILES = ['.env', '.env.development'];
const OUTPUT_FILE = '.env.sample';

function parseEnv(content) {
    return content
        .split('\n')
        .map(line => {
            const trimmed = line.trim();

            if(!trimmed || trimmed.startsWith('#')) {
                return line
            }

            const idx = line.indexOf('=');
            if (idx === -1) return line;

            const key = line.slice(0, idx).trim();
            return `${key}=`;
        });
}

function generate() {
    const lines = new Map();

    for (const file of SOURCE_FILES) {
        const filePath = path.resolve(file);
        if(!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf8');
        parseEnv(content).forEach(line => {
            if(!line.trim() || line.trim().startsWith('#')) {
                lines.set(Symbol(), line);
            } else {
                const key = line.split("=")[0];
                lines.set(key, line);
            }
        });
    }

    const output = Array.from(lines.values()).join('\n') + '\n';
    fs.writeFileSync(OUTPUT_FILE, output);
    console.log('.env.sample generated')
}

generate();