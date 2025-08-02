const bcrypt = require('bcrypt');

const password = 'ProNet@025'; 
const saltRounds = 10; 

// Hash the password
bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    console.log('Hashed password:', hash);
});
