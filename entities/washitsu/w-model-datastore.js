
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


const kind = 'Washitsu';
const errorLocation = "Washitsu Model DT | ... ";

/**
 * New washitsu
 * @param {Object} data     Properties for the washitsu group
 * @returns a string that contains the new key.
 */
const createWashitsu = async (data) => {
    const washitsuData = {
        "roomName": data.roomName,
        "maxCapacity": data.maxCapacity,
        "allowSmoking": data.allowSmoking
    }

    if (!checkProperties(washitsuData)) {
        console.log(errorLocation + "createWashitsu error, missing properties");
        return null;
    }

    washitsuData.occupants = ""; //later inject user to this.

    try {
        const newCG = await create(kind, washitsuData);
        if (!newCG) { throw new Error() }
        return newCG;
    } catch (e) {
        console.log(errorLocation + " createWashitsu ")
        console.log(e)
        return null;
    }
}


const readAllWashitsu = async (req) => {
    return await listByLimit(kind, req);
}


/**
 * Reads a washitsu and returns
 * @param {Object} req req.query.cursor, req.protocol
 * @returns Paginated list of Washitsu
 */
const readWashitsu = async (req, id, internalUsage = false) => {
    if (!id) {
        id = req.params.id;
    }
    return await queryByKey(kind, id, internalUsage); // [entities, info]
}

/**
* Checks for existing washitsu
* @param {Object} data
* @param {String} data.membershipID
*/
const findWashitsuByName = async (data) => {
    if (!data) { return null; }
    return await queryByDetails(kind, 'roomName', data.roomName);
}

/**
 * Updates a washitsu
 * @param {Object} req used to read a washitsu, also req.body and req.params are required another function
 *  
 */
const updateWashitsu = async (req, washitsu) => {
    try {
        if (!washitsu) {
            washitsu = await readWashitsu(req, null, true);
        }
        //console.log('update - check - ', washitsu);
        const washitsuKey = await update(kind, req, washitsu);
        return washitsuKey;
    } catch (error) {
        console.log(errorLocation + ' updateWashitsu', error);
        return null;
    }
}

const deleteWashitsu = async (req, washitsu) => {
    try {
        if (!washitsu) {
            washitsu = await readWashitsu(req);
        }

        //console.log(washitsu)
        if (!washitsu) {
            return null;
        }
        await remove(kind, getKey(washitsu)['id']);
        return washitsu;
    } catch (error) {
        console.log(errorLocation + " deleteWashitsu " + error);
        return null;
    }
}

const assignGuestToWashitsu = async (washitsu, member) => {
    // console.log("---w-model.datastore---");
    // console.log(washitsu);
    let req = {
        params: {
            id: washitsu.id
        },
        body: {
            occupants: member ? getKey(member)['id'].toString() : ""
        }
    }
    return await updateWashitsu(req, washitsu);
}

const checkForOccupantsChange = (data) => {
    let keys = Object.keys(data);
    return keys.includes('occupants');
}



module.exports = {
    createWashitsu,
    readAllWashitsu,
    readWashitsu,
    findWashitsuByName,
    updateWashitsu,
    deleteWashitsu,
    assignGuestToWashitsu,
    checkForOccupantsChange
}
