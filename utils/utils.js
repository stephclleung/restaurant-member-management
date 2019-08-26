const { getKey } = require('../entities/CRUD-datastore')
const { readUser } = require('../entities/user/u-model-datastore');
const jwt = require('jsonwebtoken');

// const dotenv = require('dotenv');
// dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

const errorLocation = "Utils | ";
const jsonCheck = (req) => {
    const accepts = req.accepts(['application/json']); //Checks if json / html / neither
    if (!accepts || req.headers.accept.length < 1) {
        console.log(errorLocation + "jsonCheck" + req.headers.accept)
        return false;
    }
    return true;
}

/**
 * Generates the token with DATASTORE _id.
 * Note: Client NEVER knows what this is ...
 * @param {object} user User entity. Contains id
 * @param {Number} user[datastore.KEY]
 */
const generateJWT = async (user) => {
    // console.log('modeldatastore | generateJWT User |', user);
    // retrieve
    let id = getKey(user)['id'];
    console.log(id)
    const token = jwt.sign({ _id: id.toString() }, jwtSecret);
    user.tokens = user.tokens.concat({ token });
    return { user, token };
}

/**
 * Checks with JWT to see if tokens
 * @param {Object} req 
 * @param {Object} res 
 * @param {Function} next 
 */
const authWithJWT = async (req, res, next) => {
    let user;
    try {
        console.log('!!!! AUTH | ..... ')
        //Grab the token from header and fix
        console.log(req.header('Authorization'))
        if (!req.header('Authorization')) {
            return res.status(401).send({ error: "Missing credentials. Did you login?" })
        }
        const token = req.header('Authorization').replace('Bearer ', '');

        //Decode it
        const decoded_id = jwt.verify(token, jwtSecret);
        //Find user that is suppose to match it
        console.log(decoded_id)
        user = await matchUserAndToken(decoded_id, token);
        //No? SCREAM.
        console.log(user);
        if (user.status) {
            throw new Error();
        }

        let userID = getKey(user)['id'];
        //Checking login to id.
        if (req.params.id && userID !== req.params.id) {
            console.log("NOTEd params: ", req.params)
            user = { status: 403, message: "You are not authorized to do that." }
            throw new Error()
        }
        // if (req.params.id && user.)
        //Other glue stuff on
        req.token = token;
        req.user = user;

        next();

    } catch (e) {
        console.log(e)
        return res.status(user.status).send({ message: user.message })
    }
}

/**
 * Query with a decoded _id stored on datastore. See if it matches the token
 * @param {String} decoded_id
 * @param {String} token
 */
const matchUserAndToken = async (decoded_id, token) => {
    try {

        const user = await readUser(null, decoded_id._id);

        if (!user) {
            console.log('Utils | matchUserAndToken | Cannot find staff user');
            return { status: "401", message: "Cannot find staff user." };
        }


        if (!user.tokens.find(t => t.token === token)) {
            console.log('Utils | match user | wrong token')
            console.log(user.tokens)
            return { status: "403", message: "Incorrect token." }
        }
        else {
            console.log('Utils |  Staff user authorized ');
        }

        return user;

    } catch (error) {
        //likely wrong user.
        console.log(errorLocation + " " + error);
        return null;
    }

}

module.exports = {
    jsonCheck,
    generateJWT,
    authWithJWT
};