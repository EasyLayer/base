require('ts-node').register({ transpileOnly: true });
const { loadBlock } = require('./load-block');

module.exports = loadBlock;
