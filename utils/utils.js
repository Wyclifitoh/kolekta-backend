// utils.js
const crypto = require('crypto');

/**
 * Generates a unique identifier.
 * @param {number} length - The length of the generated UID in bytes.
 * @returns {string} - The generated UID.
 */
function generateUid(length = 16) {
    return crypto.randomBytes(length).toString('hex');
}

module.exports = generateUid;
