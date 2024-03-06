import fastify from 'fastify';
import {
	authenticate,
	connectDB,
	defaultErrorCode,
	deleteUser,
	getUser,
	updateUser,
	verifyMaster
} from "./persistence.js";

const server = fastify();

server.get('/', async (req, res) => {
	const {code, msg} = await authenticate(req.headers)
	const ignoredUris = ['/favicon.ico']
	if (code === defaultErrorCode) {
		res.header('Www-Authenticate', `Basic realm="traefik"`);
		res.status(code).send(msg)
	}
	else res.status(200)
});

server.get('/user', async (req, res) => {
	try {
		verifyMaster(req.headers)
		res.status(200).send(await getUser(req.params.name))
	}
	catch (err) {
		const {code, msg} = err
		res.status(code).send(msg)
	}
});

server.post('/user', async (req, res) => {
	verifyMaster(req.headers)
	const {name, password} = req.body
	const {code,msg} = await updateUser(name,password)
	res.status(code).send(msg)
});

server.delete('/user/:name', async (req, res) => {
	try {
		verifyMaster(req.headers)
		const {name} = req.params
		await deleteUser(name)
		res.status(200).send(`Deleted user ${name}`)
	}
	catch (err) {
		const {code} = err
		res.status(code).send('Cannot delete non existent user!')
	}
});

server.listen({port: 3000, host: '0.0.0.0'}, async (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	await connectDB()
	console.log(`Server listening at ${address}`);
});
