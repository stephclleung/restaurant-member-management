
const {
    getKey,
    checkProperties,
    create,
    listByLimit,
    queryByDetails,
    queryByKey,
    update,
    remove
} = require('../CRUD-datastore');
//const { projectID, jwtSecret } = require('../config/config');


const kind = 'User';
const errorLocation = "User Model DT | ... ";

/**
 * New User
 * @param {Object} data     Properties for the User group
 * @returns a string that contains the new key.
 */
const createUser = async (data) => {
    const userData = {
        "loginID": data.loginID,
        "password": data.password,
        "name": data.name,
    }

    if (!checkProperties(userData)) {
        console.log(errorLocation + "createUser error, missing properties");
        return null;
    }

    userData.tokens = [];
    //userData.accounts = [];

    try {
        const newUser = await create(kind, userData);
        if (!newUser) { throw new Error() }
        return newUser;
    } catch (e) {
        console.log(errorLocation + " createUser ")
        console.log(e)
        return null;
    }
}


const readAllUser = async (req) => {
    return await listByLimit(kind, req);
}


/**
 * Reads a User and returns
 * @param {Object} req req.query.cursor, req.protocol
 * @returns Paginated list of User
 */
const readUser = async (req, id, internalUsage = false) => {
    if (!id) {
        id = req.params.id;
    }
    return await queryByKey(kind, id, true); // [entities, info]
}

/**
* Checks for existing User
* @param {Object} data
* @param {String} data.name
*/
const findUserByloginID = async (data) => {
    if (!data) { return null; }
    return await queryByDetails(kind, 'loginID', data.loginID);
}


const findAccountsByUser = async (user) => {
    //(kind, search, target)
    return await queryByDetails('Member', 'accountManager', user.loginID, true)
}

/**
 * Updates a User
 * @param {Object} req used to read a User, also req.body and req.params are required another function
 *  
 */
const updateUser = async (req, user) => {
    try {
        if (!user) {
            user = await readUser(req, user, true);
        }
        const userKey = await update(kind, req, user);
        return userKey;
    } catch (error) {
        console.log(errorLocation + ' updateUser', error);
        return null;
    }
}

const deleteUser = async (id) => {
    try {
        console.log("kind", kind);
        console.log("id", id);
        await remove(kind, id);
        return id;
    } catch (error) {
        console.log(errorLocation + " deleteWashitsu " + error);
        return null;
    }

}


module.exports = {
    createUser,
    readAllUser,
    readUser,
    findUserByloginID,
    findAccountsByUser,
    updateUser,
    deleteUser,
}
