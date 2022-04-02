const rules = {
  "array-bracket-spacing": [
    'error',
    'always',
  ],
}

module.exports = {
  extends: [
    '@chatie',
  ],
  rules,
  "globals": {
    "NodeJS": true
  },
}
