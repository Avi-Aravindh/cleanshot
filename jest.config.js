module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|@react-native-community|@testing-library)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^expo-(.*)$': '<rootDir>/node_modules/expo-$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
};
