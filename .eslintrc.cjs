module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: ['eslint:recommended', 'prettier'],
  ignorePatterns: ['dist', '.next', 'node_modules']
};
