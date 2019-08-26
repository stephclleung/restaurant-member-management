const { Datastore } = require('@google-cloud/datastore');

const projectId = 'leungst-493-w9-final';
const datastore = new Datastore({
    projectId: projectId
});

//debug
const url = 'http://leungst-493-w9-final.appspot.com';
const chalk = require('chalk');
const errorLocation = "CRUD-datastore.js | ";

/**
 * Retrieves datastore. Access ['id'] for the id.
 * @param {Object} entity Datastore object
 * @returns datastore key
 */
const getKey = (entity) => {
    return entity[datastore.KEY]
}


/**
 * 
 * @param {Object} entity Single entity
 * @param {String} entity[datastore.KEY][id]    entity id
 * @returns entity with id and url added.
 */
const addURLandID = (entity, kind) => {
    try {
        if (!entity) { return null; }

        entity.id = getKey(entity)['id'];
        entity.self = `${url}/${kind.toLowerCase()}s/${entity.id}`;
        return entity;
    } catch (error) {
        console.log(chalk.red(error));
        throw new Error(errorLocation, error);
    }
}

const checkProperties = (obj) => {
    for (var key in obj) {
        if (obj[key] === null && obj[key] === "")
            return false;
    }
    return true;
}

/**
 * 
 * @param {String} kind    Datastore kind 
 * @param {Object} data    data.propertie for that particular entity. 
 * @returns returns a datastore key
 */
const create = async (kind, data) => {
    const key = datastore.key(kind);
    try {
        await datastore.save({ "key": key, "data": data });
        return key;
    } catch (err) {
        console.log(errorLocation);
        console.log(err);
        return null;
    }
}

/**
 * 
 * @param {String} kind Member/user/washitsu
 * @param {*} req       request
 * @param {*} dataID    
 * @returns an array [entities , info] where entities is the array of 5 listings, and info is the more result / not indication 
 * TODO : count total of collections...
 */
const listByLimit = async (kind, req, dataID) => {
    let query = datastore
        .createQuery(kind)
        .limit(5);

    if (req.query.cursor) {
        const uri = req.query.cursor.replace(/ /g, "+");
        query = query.start(uri);
    }

    const results = await datastore.runQuery(query);
    //console.log(results);
    const entities = results[0];
    entities.forEach(entity => {
        entity = addURLandID(entity, kind);
    })


    const info = results[1];
    if (info.moreResults !== Datastore.NO_MORE_RESULTS && dataID) {
        info.next = `${req.protocol}://${req.get("host")}${req.baseUrl}/${dataID}/cargo?cursor=${info.endCursor}`;
    }
    else if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
        info.next = `${req.protocol}://${req.get("host")}${req.baseUrl}?cursor=${info.endCursor}`;
    }

    let query_counter = datastore.createQuery(kind);
    const results_counter = await datastore.runQuery(query_counter);
    // console.log("Second query is back");
    // console.log(results_counter[0].length);

    info.totalItemsInCollection = results_counter[0].length;

    return [entities, info];
}

/**
 * Runs query as passed through arguments
 * @param {String} kind         Datastore kind
 * @param {String} search       column on datastore
 * @param {Object} target       Query to be run in datastore
 * @param {Boolean} multiple    Defaults to false. Mark true if you need more than one entity.
 * @return {Boolean}        True if found
 */
const queryByDetails = async (kind, search, target, multiple = false) => {
    console.log("kind " + kind);
    console.log("serach " + search)
    console.log("target " + target)
    const query = datastore
        .createQuery(kind)
        .filter(search, '=', target);
    try {
        const [found] = await datastore.runQuery(query);
        if (multiple) return found.length > 0 ? found : false
        return found.length > 0 ? found[0] : false;
    } catch (error) {
        console.log(errorLocation + error);
    }
}

/**
 * Reads a specific item
 * @param {String}  kind Type stored on datastore
 * @param {String}  id   ID used to make key along with kind
 */
const queryByKey = async (kind, id, internalUsage) => {
    const key = datastore.key([kind, parseInt(id)]);
    // console.log("--------------------before query ================")
    // console.log(id)
    // console.log(kind)
    // console.log(key);
    try {
        let entityGroup = await datastore.get(key);
        // console.log("Query by key results : ")
        // console.log(entityGroup);
        let thisEntity = entityGroup[0];

        if (!internalUsage) {
            thisEntity = addURLandID(thisEntity, kind);
        }

        return thisEntity;
    } catch (err) {
        console.log(errorLocation + " queryByKey | ")
        console.log(err);
        return err;
    }
}

const removeURLandID = (entity) => {
    if (entity.id) delete entity.id
    if (entity.self) delete entity.self

    return entity;
}

const update = async (kind, req, entity) => {
    let key = getKey(entity);
    try {

        //Skip this part unless body contains update contents        
        if (req && req.body) {
            //Disallow modification of ID.
            req.body = removeURLandID(req.body);

            // console.log("update:::::: key : ", key)

            const updateData = Object.keys(req.body);
            updateData.forEach((field) => {
                entity[field] = req.body[field];
            });
        }
        if (entity) {
            entity = removeURLandID(entity);
        }
        const entityToSave = { key, data: entity };
        const entityKey = await datastore.upsert(entityToSave);

        return entityKey;
    } catch (error) {
        console.log(errorLocation + " update | " + kind + " | " + error);
        return null;
    }
}

const remove = async (kind, id) => {

    console.log(" CRUD | REMOVE | " + id)
    const key = datastore.key([kind, parseInt(id)]);
    try {
        const deleted = await datastore.delete(key);
        return deleted;
    } catch (error) {
        console.log(errorLocation + " remove " + error);
        return null;
    }
}

module.exports = {
    getKey,
    checkProperties,
    create,
    listByLimit,
    queryByDetails,
    queryByKey,
    update,
    remove
}