const baseConfig = require('@easylayer/utils/jests/base.config');

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