import {
    authenticate,
    checkServiceExists,
    defaultErrorCode, getServiceHeader, getServiceToken,
    getUser,
    verifyMaster
} from "../scripts/functions.js";
import {COLLECTIONS, deleteDocument, getDocument, updateUser, upsert} from "../scripts/database.js";
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

    server.get('/token', async (req, res) => {
        const domain = getServiceHeader(req.headers)?.split('//')[1]
        if(checkServiceExists(domain) && 'authorization' in req.headers) {
            const auth = req.headers.authorization.split('Bearer')[1].trim()
            const service = await getDocument(COLLECTIONS.services,{domain}, {_id:1, value:1})
            if(service.value === auth) {
                return res.status(200).send(await getServiceToken(service))
            }
        }
        res.status(400).send('Service unknown!')
    })

    server.post('/token', async (req, res) => {
        try {
            const domain = getServiceHeader(req.headers)?.split('//')[1]
            const isMemorable = (req.query.memorable === 'true') || false
            if(checkServiceExists(domain)) {
                const query = {domain}
                let _id
                try {
                    _id = (await getDocument(COLLECTIONS.services,query))._id
                }
                catch (e) {
                    _id = generatePassword(5, true)
                }
                const data = {
                    _id,
                    value: generatePassword(req.query.length || 20, isMemorable),
                    domain,
                    registered: new Date()
                }
                await upsert(data, COLLECTIONS.services)
                res.status(200).send(await getServiceToken(data))
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