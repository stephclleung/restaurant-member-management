const jwt = require('jsonwebtoken');
const { matchUserAndToken } = require('../../user/u-model-datastore');
// const { jwtSecret } = require('../config/config');
const jwtSecret = process.env.JWT_SECRET;


const authWithJWT = (req, res, next) => {
    console.log('!!!! AUTH | ..... ')
    //Grab the token from header and fix
    console.log(req.header('Authorization'))
    if (!req.header('Authorization')) {
        return res.status(401).send({ error: "Missing credentials. Did you login?" })
    }
    const token = req.header('Authorization').replace('Bearer ', '');

    //Decode it
    const decoded_id = jwt.verify(token, jwtSecret);
    console.log(decoded_id)


    //Check if such staff exists, and if staff has that token.
    let user = await matchUserAndToken(decoded_id, token);

    let keys = Object.keys(req.params);
    if (keys.includes("id_w")) {
        //modifying a room
        user = authToModifyRoom(user);
    }
    else if (keys.include("id_m")) {
        //modifying a member
        user = authToModifyMember(decoded_id, token, keys["id_m"]);
    }
    else {
        //signing up a member 
        user = authToSignupMember(decoded_id);
    }
}

/**
 * Checks if staff is authenticated to touch the member's account
 * @param {Object} user
 */
const authToModifyMember = async (user) => {
    try {
        //Check if the authenticated staff can touch this account
        const accountMatch = user.accounts.find((account) => {
            return account.id === id
        });

        if (!accountMatch || user.status) {
            if (!user.status) {
                user = { status: 403, message: "You cannot do that." }
            }
            throw new Error();
        }
        return user;
    } catch (error) {
        console.log("AUTH : ", e);
        return user;
    }
}


/**
 * Checks if staff is authenticated to touch the member's account
 * @param {String} decoded_id 
 * @param {String} token 
 * @param {String} id 
 */
const authToModifyRoom = async (decoded_id, token, id) => {
    let user;
    try {
        //Check if such staff exists, and if staff has that token.
        user = await matchUserAndToken(decoded_id, token);

        //Check if the authenticated staff can touch this account
        const accountMatch = user.accounts.find((account) => {
            return account.id === id
        });

        if (!accountMatch || user.status) {
            if (!user.status) {
                user = { status: 403, message: "You cannot do that." }
            }
            throw new Error();
        }
        return user;
    } catch (error) {
        console.log("AUTH : ", e);
        return user;
    }
}



/**
 * Query with a decoded _id stored on datastore. See if it matches the token submited
 * This checks if token EXISTS in server
 * @param {String} decoded_id
 * @param {String} token
 */
const matchUserAndToken = async (decoded_id, token) => {

    console.log('model-datastore | got decoded_id,', decoded_id);
    try {

        const user = await readUser(null, decoded_id._id);

        //Cannot find a user that matches to this ID
        if (!user) {
            console.log('model-datastore | Cannot find user');
            return { status: "401", message: "Cannot find user." };
        }

        //Found the user, but the user does not have this token
        if (!user.tokens.find(t => t.token === token)) {
            console.log('model-datastore | match user | wrong token')
            console.log(user.tokens)
            return { status: "403", message: "Incorrect token." }
        }
        else {
            console.log('model-datastore |  ok')
        }

        return user;

    } catch (error) {
        //likely wrong user.
        console.log(errorLocation + " " + error);
        return null;
    }

}


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
        res.status(user.status).send({ message: user.message })
    }
}