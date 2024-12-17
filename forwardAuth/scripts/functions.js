import argon2 from "argon2";
import {COLLECTIONS, getDocument, getUsersList} from './database.js'
import generatePassword from "password-generator";
import jwt from "jsonwebtoken";

const base = '$argon2id$v=19$m=65536,t=3,p=4$'
const SERVICE_HEADER = 'x-service'

export const defaultErrorCode = 401

export async function authenticate(headers) {
    const isServiceAuth = SERVICE_HEADER in headers || !('authorization' in headers)
    const authorization = isServiceAuth ? headers[SERVICE_HEADER] : headers.authorization
    const isWs = headers['sec-fetch-mode'] === 'websocket'
    const authReturn = {
        code:  isServiceAuth ? 403 : defaultErrorCode,
        msg: isServiceAuth ? "Not authorized to access this resource" : 'No authorization possible. Please check your credentials'
    }

    try {
        if (!isWs && !authorization) {
            return authReturn
        }
        else {
            if (isWs) {
                return {
                    code: 200,
                    msg: 'Websockets can go'
                }
            }
            else {
                let auth
                if(isServiceAuth) {
                    auth = jwt.verify(headers[SERVICE_HEADER],process.env.SECRET)
                }
                else auth = atob(authorization.split('Basic')[1])
                const [name, pw] = auth.split(':');
                const projection = {_id: isServiceAuth ? 1 : 0}
                projection[isServiceAuth ? 'auth' : 'password'] = 1
                const doc = await getDocument(isServiceAuth ? COLLECTIONS.services : COLLECTIONS.users,{[isServiceAuth ? '_id' : 'name']: name}, projection)
                const passwd = getHashString(name, isServiceAuth ? getServiceAuth(pw) : pw)

                if (await argon2.verify(base + (isServiceAuth ? doc.auth : doc.password), passwd)) {
                    return {
                        code: 200,
                        msg: 'Authentication successful'
                    }
                }
                else {
                    return authReturn
                }
            }
        }
    } catch (err) {
        if(err.code === 404) {
            return {
                code: 422,
                msg: `Resource not found. Please contact an administrator!`
            }
        }
        return authReturn
    }
}

export function verifyMaster({authorization}) {
    if (!!authorization && authorization.startsWith('Bearer')) {
        const auth = authorization.split('Bearer')[1].trim()
        if (process.env.MASTER_AUTH === auth) {
            return {
                code: 200,
                msg: 'Authorized'
            }
        }
    }
    throw {
        code: 403,
        msg: 'Not authorized!'
    }
}

export function getHashString(name, password) {
    return [name, password].join('|')
}

export function getRandomPassword() {
    return generatePassword(20, false)
}

export async function hash(hash) {
    return (await argon2.hash(hash)).substring(base.length)
}

export async function getUser() {
    const users = await getUsersList()
    if (users.length === 0) {
        throw {
            code: 409,
            msg: 'No users to show!'
        }
    }
    return users.map(u => u._id)
}

export function getServiceAuth(auth) {
    return process.env.SECRET+auth
}