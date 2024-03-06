export const ENTRYPOINTS = {
	WEB: "web",
	WEB_SECURE: "websecure"
}
export const MIDDLEWARES = {
	stripPrefix: 'stripPrefix',
	forwardAuth: 'forwardAuth',
	redirectHttps: 'redirectHttps',
	addCors: 'addCors'
}
export const {DOMAIN,SUB_DOMAIN} = process.env