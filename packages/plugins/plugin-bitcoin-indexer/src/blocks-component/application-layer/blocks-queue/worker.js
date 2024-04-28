require('ts-node').register({ transpileOnly: true });
const { parseBlock } = require('./parser-worker');

module.exports = parseBlock;
