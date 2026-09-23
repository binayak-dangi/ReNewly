// Jest stand-in for a single lucide icon module (see moduleNameMapper in jest.config.js).
const React = require('react');
const { View } = require('react-native');

function Icon(props) {
  return React.createElement(View, { testID: 'icon', ...props });
}

module.exports = { __esModule: true, default: Icon };
