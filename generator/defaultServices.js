import {DOMAIN, ENTRYPOINTS, MIDDLEWARES} from './exports.js'

export default [
  ...['dashboard'].map(name => {
    return {
      name,
      displayName:'Trafik Dashboard',
      entryPoints: [ENTRYPOINTS.WEB],
      url: [DOMAIN],
      servers: []
    }
  }),
  ...['traefikAuth'].map(name => {
    return {
      name,
      displayName:'Traefik Authentifizierung',
      entryPoints: [ENTRYPOINTS.WEB],
      middlewares: [MIDDLEWARES.stripPrefix],
      url: [DOMAIN, 'traefik/auth'],
      servers: [`http://${name}:3000`]
    }
  })
]