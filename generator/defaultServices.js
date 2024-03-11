import {DOMAIN, ENTRYPOINTS, MIDDLEWARES} from './exports.js'

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
      entryPoints: [ENTRYPOINTS.WEB],
      middlewares: [MIDDLEWARES.stripPrefix],
      url: [DOMAIN, 'traefik/auth'],
      servers: [`http://${name}:3000`]
    }
  })
]