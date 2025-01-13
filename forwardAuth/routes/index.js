import {
    authenticate,
    checkServiceExists,
    defaultErrorCode,
    getCookie,
    getUser,
    verifyMaster
} from "../scripts/functions.js";
import {COLLECTIONS, deleteDocument, updateUser, upsert} from "../scripts/database.js";
import generatePassword from "password-generator";

export default function (server, _, done) {
    server.get('/', async (req, res) => {
        const {code, msg} = await authenticate(req.headers)
        if (code === defaultErrorCode) {
            res.header('Www-Authenticate', `Basic realm="traefik"`);
            return res.status(code).send(msg)
        }
        res.status(code).send(msg)
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

    server.get('/cookie', async (req, res) => {
        try {
            const domain = req.headers.origin?.split('//')[1]
            if(checkServiceExists(domain) && 'slug' in req.query) {
                const data = {
                    _id: domain+req.query.slug,
                    value: generatePassword(),
                    started: new Date()
                }
                await upsert(data, COLLECTIONS.services)
                const cookie = getCookie(data.value, domain, req.query.slug)
                res.header('Set-Cookie', cookie)
                res.status(200).send(cookie)
            }
            res.status(400).send('Cannot generate authentication!')
        } catch (err) {
            console.log(err);
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