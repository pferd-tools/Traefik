import {authenticate, defaultErrorCode, getUser, verifyMaster} from "../scripts/functions.js";
import {deleteDocument, registerProtectedService, updateUser} from "../scripts/database.js";
import services from '/usr/src/services.js'

export default function (server, _, done) {
    server.get('/', async (req, res) => {
        const {code, msg} = await authenticate(req.headers)
        if (code === defaultErrorCode) {
            res.header('Www-Authenticate', `Basic realm="traefik"`);
            return res.status(code).send(msg)
        }
        res.status(code).send(msg)
    });

    server.get('/register/:service', async (req, res) => {
        try {
            verifyMaster(req.headers)
            const service = req.params.service
            const serviceNames = services.map(service => service.name)
            if(serviceNames.includes(service)) {
                res.status(200).send(await registerProtectedService(service))
            }
            else res.status(409).send(`Service "${service}" not found`)
        } catch (err) {
            const {code, msg} = err
            res.status(code).send(msg)
        }
    });

    server.get('/user', async (req, res) => {
        try {
            verifyMaster(req.headers)
            res.status(200).send(await getUser())
        } catch (err) {
            const {code, msg} = err
            res.status(code).send(msg)
        }
    });

    server.post('/user', async (req, res) => {
        verifyMaster(req.headers)
        const {name, password} = req.body
        const {code, msg} = await updateUser(name, password)
        res.status(code).send(msg)
    });

    server.delete('/user/:name', async (req, res) => {
        try {
            verifyMaster(req.headers)
            const {name} = req.params
            await deleteDocument({_id: name})
            res.status(200).send(`Deleted user ${name}`)
        } catch (err) {
            res.status(400).send('Cannot delete non existent user!')
        }
    });

    done()
}