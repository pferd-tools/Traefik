import { MongoClient, ServerApiVersion } from 'mongodb'
import jwt from 'jsonwebtoken'
import {getHashString, getRandomPassword, getServiceAuth, hash} from "./functions.js";

export const COLLECTIONS = {
    users: 'users',
    services: 'services'
}
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@traefikDB:27017`
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        deprecationErrors: true
    }
});
let db

export async function connectDB(){
    const dbName = 'traefik'
    db = client.db(dbName)
    console.log(`Database ${dbName} is ready!`)
}

export async function save(payload, collection = COLLECTIONS.users){
    await db.collection(collection).insertOne(payload)
}

export async function getDocument(collection, query = {}, projection = {}, forceArray = false) {
    const docs = await db.collection(collection).find(query).project(projection).toArray()
    if(docs.length === 0) throw {
        code: 404,
        msg: 'No documents!'
    }
    else if(docs.length === 1 && !forceArray) return docs[0]
    return docs
}

export async function deleteDocument(query, collection = COLLECTIONS.users){
    await db.collection(collection).deleteOne(query)
}

export async function getUsersList(){
    try {
        const users = await getDocument(COLLECTIONS.users, {}, {}, true)
        if(!users) throw {
            code: 409,
            msg: 'No users to show!'
        }
        return users
    }
    catch (e){
        return []
    }
}

export async function updateUser(name,password){
    let returnObj
    const newUser = {
        name,
        password: await hash(getHashString(name,password))
    }
    try {
        const user = await getDocument(COLLECTIONS.users,{name}, {name: 1})
        await db.collection(COLLECTIONS.users).updateOne({name: user.name},{$set:{password: newUser.password}})
        returnObj = {
            code: 200,
            msg: `Updated user ${user.name} with a new password`
        }
    }
    catch (err) {
        await save(newUser)
        returnObj = {
            code: 201,
            msg: `Added user ${name}`
        }
    }

    return returnObj
}

export async function registerProtectedService(serviceName) {
    const password = getRandomPassword()
    const auth = await hash(getHashString(serviceName,getServiceAuth(password)))
    try {
        const service = await getDocument(COLLECTIONS.services, {_id: serviceName}, {_id: 1})
        await db.collection(COLLECTIONS.services).updateOne({_id: service._id},{$set:{auth}})
    }
    catch (e) {
        await save({
            _id: serviceName,
            auth
        }, COLLECTIONS.services)
    }

    return await jwt.sign([serviceName,password].join(':'), process.env.SECRET)
}