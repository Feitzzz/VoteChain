/**
 * Utility script to generate secure random JWT secrets
 * Run this script with Node.js to generate a new secret:
 * node utils/generateSecret.js
 */

const crypto = require('crypto');

// Generate a random string of 64 hex characters (32 bytes)
function generateJwtSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate and log the secret
const secret = generateJwtSecret();
console.log('\n=== JWT SECRET GENERATOR ===');
console.log('\nYour new JWT secret:');
console.log(secret);
console.log('\nCopy this value into your .env file as JWT_SECRET\n');

// Export for potential use in other utilities
module.exports = { generateJwtSecret }; 