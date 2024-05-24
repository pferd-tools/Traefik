import fs from 'fs-extra'
import PATH from 'path'
import 'dotenv/config'
import { interpolation } from 'interpolate-json';
import YAML from 'js-yaml';
import {DOMAIN, ENTRYPOINTS, MIDDLEWARES} from "./exports.js";
import defaultServices from "./defaultServices.js";

async function generate(){
	const userServicesFile = './services.js'
	const prefixes = []
	const REPLACE_VARIABLES = {DOMAIN}
	const json = {
		http:{
			routers: {},
			services: {},
			middlewares:{}
		}
	}

	const services = defaultServices
	if(await fs.exists(userServicesFile)){
		try {
			const userServices = (await import(userServicesFile)).default;
			if(Array.isArray(userServices)){
				userServices.forEach(service => {
					const overwriteService = services.find(defService => defService.name === service.name)
					if(overwriteService){
						for(const key in service){
							const value = service[key]
							if(Array.isArray(value) && key in overwriteService && key === 'middlewares'){
								value.forEach(val => {
									if(!overwriteService[key].includes(val)) {
										overwriteService[key].push(val)
									}
								})
							}
							else overwriteService[key] = value
						}
					}
					else services.push(service)
				})
			}
			else throw new Error()
		}
		catch (e){
			console.log('No user services found')
		}
	}
	services.forEach(def => {
		const {name,entryPoints,middlewares = [],url = [],servers,isTcp = false} = def
		const hasServers = !!servers && servers.length > 0
		let service
		if(hasServers) service = `${name}-service`
		else service = `api@internal`

		const routerDef = {
			entryPoints,
			middlewares,
			service
		}
		if(isTcp){
			routerDef.rule = `HostSNI(\`${url}\`)`
		}
		else{
			const path = url.slice(1).join('/')
			const rules = [`HOST(\`${url[0]}\`)`,`PathPrefix(\`/${path}\`)`]
			routerDef.rule = rules.join(' && ')
			if(hasServers) prefixes.push(`/${path}`)
		}
		if(middlewares.some(mw => mw === MIDDLEWARES.redirectHttps)){
			routerDef.tls = {
				certResolver: 'letsencrypt'
			}
		}
		const key = isTcp ? 'tcp' : 'http'
		json[key].routers[name] = routerDef
		if(hasServers){
			json[key].services[service] = {
				loadBalancer:{
					servers: servers.map(server => {
						return {[isTcp ? 'address' : 'url']:server}
					})
				}
			}
		}
	})
	REPLACE_VARIABLES.PREFIXES = JSON.stringify(prefixes)

	json.http.middlewares = fs.readdirSync('./middlewares').reduce((acc,name) => {
		const content = fs.readFileSync(`./middlewares/${name}`, 'utf8')
		const json = YAML.load(interpolation.expand(content,REPLACE_VARIABLES))
		acc = {...acc, [name.split('.')[0]]: json}
		return acc
	},{})
	return {json,services}
}

generate().then(({json,services}) => {
	const outputDir = '/usr/src/traefik'
	fs.ensureDir(outputDir).then(() => {
		fs.writeFileSync(PATH.join(outputDir,`dynamicConf.yml`),YAML.dump(json))
		console.log('All dynamic configurations written')
		if(process.env.EXPORT_SERVICES_DIR !== '/dev/null'){
			console.log('Starting export of services')
			const dir = PATH.resolve('monitor')
			fs.ensureDir(dir).then(() => {
				const content = services.map(service => {
					const {displayName:name,entryPoints,url,expectedCode = 200,middlewares = []} = service
					const useAuth = middlewares.includes(MIDDLEWARES.forwardAuth)
					url[0] = `http${entryPoints.includes(ENTRYPOINTS.WEB_SECURE) ? 's' : ''}://${'85.214.37.62'/*url[0]*/}`
					return {name,url:url.join('/'),expectedCode,useAuth}
				})
				fs.writeFileSync(PATH.join(dir,'traefikServices.js'),`module.exports = ${JSON.stringify(content)}`)
				console.log('Finished export of services')
			})
		}
	})
})
