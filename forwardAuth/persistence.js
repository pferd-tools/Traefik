import argon2 from "argon2";
import { MongoClient, ServerApiVersion } from 'mongodb'

const COL = 'users'
const base = '$argon2id$v=19$m=65536,t=3,p=4$'
const {MONGO_INITDB_ROOT_USERNAME: username,MONGO_INITDB_ROOT_PASSWORD:password} = process.env
const uri = `mongodb://${[username,password].join(':')}@traefikDB:27017`
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        deprecationErrors: true
    }
});
let db

export const defaultErrorCode = 401

export async function connectDB(){
    const dbName = 'traefik'
    db = client.db(dbName)
    console.log(`Database ${dbName} is ready!`)
}

export async function authenticate(headers) {
    try {
        const users = await getUsersList()
        const authorization = headers.authorization
        const isWs = headers['sec-fetch-mode'] === 'websocket'
        if (users.length === 0) {
            return {
                code: 422,
                msg: 'No users found. Please contact an administrator'
            }
        }
        else if (!isWs && !authorization) {
            return {
                code: defaultErrorCode,
                msg: 'Could not authenticate. Please login'
            }
        }
        else {
            if(isWs){
                return {
                    code: 200,
                    msg: 'Websockets can go'
                }
            }
            else{
                const [name, pw] = atob(authorization.split('Basic')[1]).split(':');
                const user = await getUser(name)
                const passed = getHashString(name,pw)
                if (await argon2.verify(base+user.password,passed)) {
                    return {
                        code: 200,
                        msg: 'Authentication successful'
                    }
                }
                else {
                    return {
                        code: defaultErrorCode,
                        msg: 'No authorization possible. Please check your credentials'
                    }
                }
            }
        }
    }
    catch (err) {
        return {
            code: defaultErrorCode,
            msg: 'No authorization possible. Please check your credentials'
        }
    }
}

export function verifyMaster({authorization}){
    if(!!authorization && authorization.startsWith('Bearer')){
        const auth = authorization.split('Bearer')[1].trim()
        if(process.env.MASTER_AUTH === auth) return
    }
    throw {
        code: 403,
        msg: 'Not authorized!'
    }
}

export async function saveUser(user){
    await db.collection(COL).insertOne(user)
}

export async function deleteUser(name){
    await db.collection(COL).deleteOne({name})
}

export function getHashString(name,password){
    return [name, password].join('|')
}

async function getUsersList(){
    const users = await db.collection(COL).find().toArray()
    if(!users) return []
    return users
}

export async function getUser(name = null) {
    const users = await getUsersList()
    if(users.length === 0){
        throw {
            code: 409,
            msg: 'No users to show!'
        }
    }
    if (name) {
        const user = users.find(u => u.name === name);
        if (!user) {
            throw {
                code: 404,
                msg: 'User not found!'
            }
        }
        return user
    }
    if(users) return users.map(u => u.name)
}

export async function updateUser(name,password){
    let returnObj
    const newUser = {
        name,
        password: (await argon2.hash(getHashString(name,password))).substring(base.length)
    }
    try {
        const user = await getUser(name)
        await db.collection(COL).updateOne({_id: user._id},{$set:{name,password: newUser.password}})
        returnObj = {
            code: 201,
            msg: `Updated user ${user.name} with a new password`
        }
    }
    catch (err) {
        await saveUser(newUser)
        returnObj = {
            code: 200,
            msg: `Added user ${name}`
        }
    }

    return returnObj
}