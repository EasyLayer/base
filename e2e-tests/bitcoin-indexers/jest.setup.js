const dotenv = require('dotenv');
const path = require('node:path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.simple') });
