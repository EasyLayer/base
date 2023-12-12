const baseConfig = require('../../../jest.config.base');

module.exports = {
    ...baseConfig,
    testEnvironment: 'node',
    roots: [
        "<rootDir>/src/"
    ],
    transform: {
        "^.+\\.ts?$": "ts-jest"
    },
    testPathIgnorePatterns: baseConfig.testPathIgnorePatterns.concat([
        "<rootDir>/node_modules",
        "<rootDir>/dist"
    ])
};