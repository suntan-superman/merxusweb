const fs = require('fs');
const path = require('path');

console.log('Testing Stripe key reading...\n');

const configPath = path.join(__dirname, '../.runtimeconfig.json');
console.log('Config path:', configPath);
console.log('File exists:', fs.existsSync(configPath));

if (fs.existsSync(configPath)) {
  // Try UTF-16LE first (PowerShell default), then UTF-8
  let fileContent;
  try {
    fileContent = fs.readFileSync(configPath, 'utf16le');
    console.log('Reading as UTF-16LE...');
  } catch (error) {
    fileContent = fs.readFileSync(configPath, 'utf8');
    console.log('Reading as UTF-8...');
  }
  
  console.log('File length:', fileContent.length);
  console.log('First char code:', fileContent.charCodeAt(0));
  
  // Remove BOM if present
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    console.log('Removing BOM...');
    fileContent = fileContent.substring(1);
  }
  
  try {
    const config = JSON.parse(fileContent);
    console.log('\n✅ JSON parsed successfully!');
    console.log('Has stripe key:', !!config.stripe?.secret_key);
    if (config.stripe?.secret_key) {
      console.log('Key preview:', config.stripe.secret_key.substring(0, 15) + '...');
      
      // Now write it back as proper UTF-8
      const cleanConfigPath = path.join(__dirname, '../.runtimeconfig-clean.json');
      fs.writeFileSync(cleanConfigPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('\n💾 Clean UTF-8 version saved to:', cleanConfigPath);
    }
  } catch (error) {
    console.error('Parse error:', error.message);
  }
}
