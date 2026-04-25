const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 1, role: 'ADMIN' }, 'dev-secret-key-change-in-production-2024');
console.log(token);
