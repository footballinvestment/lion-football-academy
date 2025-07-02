module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    // LEGENDARY quality with non-blocking warnings
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': ['warn', {
      'vars': 'all',
      'args': 'after-used',
      'ignoreRestSiblings': true,
      'argsIgnorePattern': '^_'
    }],
    'no-self-compare': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unreachable': 'warn',
    'no-unused-expressions': 'warn'
  },
  overrides: [
    {
      files: ['src/**/*.{js,jsx}'],
      rules: {
        'react-hooks/exhaustive-deps': 'warn'
      }
    }
  ]
};
