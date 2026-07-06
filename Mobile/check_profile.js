const fs = require('fs');
const content = fs.readFileSync('src/screens/ProfileScreen.js', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
for (let i = 410; i < lines.length; i++) {
  console.log((i+1) + ': ' + JSON.stringify(lines[i]));
}