require('ts-node').register({ transpileOnly: true });
const { loadBlock } = require('./network-provider-pool');

module.exports = loadBlock;
