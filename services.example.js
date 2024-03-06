import {DOMAIN, SUB_DOMAIN, ENTRYPOINTS, MIDDLEWARES} from './exports.js'

export default [
    ...['dashboard'].map(name => {
        return {
            name,
            entryPoints: [ENTRYPOINTS.WEB_SECURE],
            middlewares: [MIDDLEWARES.stripPrefix, MIDDLEWARES.redirectHttps, MIDDLEWARES.forwardAuth],
            url: [DOMAIN],
            servers: [],
            useTls: true
        }
    }),
    ...['traefikAuth'].map(name => {
        return {
            name,
            entryPoints: [ENTRYPOINTS.WEB_SECURE],
            middlewares: [MIDDLEWARES.stripPrefix,MIDDLEWARES.redirectHttps],
            url: [DOMAIN, 'auth'],
            servers: [`http://${name}:3000`],
            useTls: true
        }
    })
]