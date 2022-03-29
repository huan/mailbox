const IS_PRODUCTION   = process.env['NODE_ENV'] === 'production'
const IS_DEVELOPMENT  = process.env['NODE_ENV'] === 'development'

export {
  IS_PRODUCTION,
  IS_DEVELOPMENT,
}
