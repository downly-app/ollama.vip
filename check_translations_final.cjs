const fs = require('fs');
const path = require('path');

const localesDir = './src/i18n/locales';
const enFile = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));

function flattenObject(obj, prefix = '') {
  let result = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], prefix + key + '.'));
    } else {
      result[prefix + key] = obj[key];
    }
  }
  return result;
}

const enKeys = Object.keys(flattenObject(enData));
console.log(`English file has ${enKeys.length} keys`);

// Function to check for duplicate keys in JSON structure
function checkDuplicateKeys(obj, path = '', duplicates = new Set()) {
  const seen = new Set();
  for (const key in obj) {
    if (seen.has(key)) {
      duplicates.add(`${path}${key}`);
    }
    seen.add(key);
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      checkDuplicateKeys(obj[key], `${path}${key}.`, duplicates);
    }
  }
  return duplicates;
}

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const keys = Object.keys(flattenObject(data));
  const missingKeys = enKeys.filter(key => !keys.includes(key));
  const extraKeys = keys.filter(key => !enKeys.includes(key));
  
  // Check for duplicate keys
  const duplicateKeys = checkDuplicateKeys(data);
  
  console.log(`\n${file}: ${keys.length}/${enKeys.length} keys (${missingKeys.length} missing, ${extraKeys.length} extra)`);
  
  if (duplicateKeys.size > 0) {
    console.log('\n🔴 DUPLICATE KEYS FOUND:');
    Array.from(duplicateKeys).forEach(key => {
      console.log(`  - ${key}`);
    });
  }
  
  if (extraKeys.length > 0) {
    console.log('\n🟡 Extra keys (not in en.json):');
    extraKeys.slice(0, 10).forEach(key => {
      console.log(`  - ${key}`);
    });
    if (extraKeys.length > 10) {
      console.log(`  ... and ${extraKeys.length - 10} more`);
    }
  }
  
  if (missingKeys.length > 0) {
    console.log('\n🔴 Missing keys:');
    missingKeys.slice(0, 10).forEach(key => {
      console.log(`  - ${key}`);
    });
    if (missingKeys.length > 10) {
      console.log(`  ... and ${missingKeys.length - 10} more`);
    }
  }
});

console.log('\n=== Translation Completeness Check Complete ===');