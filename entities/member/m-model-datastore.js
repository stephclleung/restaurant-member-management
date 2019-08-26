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


const kind = 'Member';
const errorLocation = "Member Model DT | ... ";

/**
 * New member
 * @param {Object} data     Properties for the Member group
 * @param {Object} staff    Authenticated staff user
 * @returns a string that contains the new key.
 */
const createMember = async (data, staff) => {
    const memberData = {
        "contactName": data.contactName,
        "membershipID": data.membershipID,
        "birthday": data.birthday,
        "membershipType": data.membershipType,
        "accountManager": staff.loginID //later inject user to this.
    }

    if (!checkProperties(memberData)) {
        console.log(errorLocation + "Member error, missing properties");
        return null;
    }


    memberData.currentRoom = "";

    try {
        const newCG = await create(kind, memberData);
        if (!newCG) { throw new Error() }
        return newCG;
    } catch (e) {
        console.log(errorLocation + " createMember ")
        console.log(e)
        return null;
    }
}


const readAllMembers = async (req) => {
    return await listByLimit(kind, req);
}


/**
 * Reads a member and returns
 * @param {Object} req req.query.cursor, req.protocol
 * @returns Paginated list of members
 */
const readMember = async (req, id, internalUsage = false) => {
    if (!id) {
        id = req.params.id
    }
    return await queryByKey(kind, id, internalUsage); // [entities, info]
}

/**
* Checks for existing member
* @param {Object} data
* @param {String} data.membershipID
*/
const findMemberByID = async (data) => {
    if (!data) { return null; }
    return await queryByDetails(kind, 'membershipID', data.membershipID);
}

/**
 * Updates a member
 * @param {Object} req used to read a member, also req.body and req.params are required another function
 *  
 */
const updateMember = async (req, member) => {
    try {
        if (!member) {
            member = await readMember(req, null, true);
        }

        const memberKey = await update(kind, req, member);

        return memberKey;
    } catch (error) {
        console.log(errorLocation + ' updateMember', error);
        return null;
    }
}

const deleteMember = async (req, member) => {
    try {
        if (!member) {
            member = await readMember(req);
            //console.log(member)
        }

        if (!member) {
            return null;
        }
        await remove(kind, getKey(member)['id']);
        return member;
    } catch (error) {
        console.log(errorLocation + error);
        return null;
    }
}

const assignRoomToMember = async (member, washitsu) => {
    // console.log("---m-model.datastore---");
    // console.log(member);
    let req = {
        params: {
            id: member.id
        },
        body: {
            currentRoom: washitsu ? getKey(washitsu)['id'].toString() : ""
        }
    }
    return await updateMember(req, member);
}

module.exports = {
    createMember,
    readAllMembers,
    readMember,
    findMemberByID,
    updateMember,
    deleteMember,
    assignRoomToMember
}
