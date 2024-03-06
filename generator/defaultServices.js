import {DOMAIN, SUB_DOMAIN, ENTRYPOINTS, MIDDLEWARES} from './exports.js'

export default [
  ...['dashboard'].map(name => {
    return {
      name,
      entryPoints: [ENTRYPOINTS.WEB],
      url: [DOMAIN],
      servers: []
    }
  }),
  ...['traefikAuth'].map(name => {
    return {
      name,
      entryPoints: [ENTRYPOINTS.WEB_SECURE],
      middlewares: [MIDDLEWARES.stripPrefix,MIDDLEWARES.redirectHttps],
      url: [DOMAIN, 'traefik/auth'],
      servers: [`http://${name}:3000`],
      useTls: true
    }
  })
]