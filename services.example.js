import {DOMAIN, ENTRYPOINTS, MIDDLEWARES} from './exports.js'

export default [
    /**
     * Overwrite preconfigured 'dashboard' service with the following changes
     * change access to a 'dashboard' subdomain on the specified DOMAIN
     * uses HTTPS (entrypoint: WEB_SECURE and useTLS: true)
     * add forward authentication (MIDDLEWARES.forwardAuth)
     */
    {
        name: 'dashboard',
        url: [`dashboard.${DOMAIN}`],
        entryPoints: [ENTRYPOINTS.WEB_SECURE],
        middlewares: [MIDDLEWARES.redirectHttps, MIDDLEWARES.forwardAuth],
        useTls: true
    },

    /**
     * Add a new service traefikTest with the following configuration
     * Accessible under route /test
     * Only accessible via HTTPS (entrypoint: WEB_SECURE and useTls: true)
     * All request to HTTP will be redirected to HTTPS (MIDDLEWARES.redirectHttps)
     * Strips the prefix /test from the URL being forwarded to the service, to ensure routing within the service is not impacted (MIDDLEWARES.stripPrefix)
     * forwards all requests to port 3000 of the 'traefikTest' container
     */
    ...['traefikTest'].map(name => {
        return {
            name,
            entryPoints: [ENTRYPOINTS.WEB_SECURE],
            middlewares: [MIDDLEWARES.stripPrefix, MIDDLEWARES.redirectHttps],
            url: [DOMAIN, 'test'],
            servers: [`http://${name}:3000`],
            useTls: true
        }
    })
]