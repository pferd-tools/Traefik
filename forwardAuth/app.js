import fastify from 'fastify';
import {connectDB} from "./scripts/database.js";
import indexRoutes from './routes/index.js'

const server = fastify();
server.listen({port: 3000, host: '0.0.0.0'}, async (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	await connectDB()
	console.log(`Server listening at ${address}`);
});
server.register(indexRoutes,{prefix: '/'})