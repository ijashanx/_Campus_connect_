const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '..', 'controllers');
const files = fs.readdirSync(controllersDir);

for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(controllersDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('sendEmail')) {
            if (!found) {
                console.log(`\n=== File: controllers/${file} ===`);
                found = true;
            }
            console.log(`Line ${i + 1}: ${lines[i].trim()}`);
        }
    }
}
process.exit(0);
