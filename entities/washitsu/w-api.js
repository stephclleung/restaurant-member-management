var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
//debug
const chalk = require('chalk');
router.use(bodyParser.json());


const {
    createWashitsu,
    readAllWashitsu,
    readWashitsu,
    findWashitsuByName,
    updateWashitsu,
    deleteWashitsu,
    assignGuestToWashitsu,
    checkForOccupantsChange } = require('./w-model-datastore');

const { jsonCheck, authWithJWT } = require('../../utils/utils');
const errorLocation = "W-API.js | ... ";

const { readMember, updateMember, assignRoomToMember } = require('../member/m-model-datastore');


router.get('/', async (req, res) => {
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const allWashitsus = await readAllWashitsu(req);
        res.status(200).send(allWashitsus);
    } catch (error) {
        console.log(errorLocation + " get W | " + error);
        res.status(500).send(error);
    }
});


router.post('/', async (req, res) => {
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const existingWashitsu = await findWashitsuByName(req.body);

        if (existingWashitsu) {
            return res.status(400).send({ message: "Washitsu with same name already exists." });
        }
        const memKey = await createWashitsu(req.body);
        if (!memKey) {
            throw new Error('error during creating a new Washitsu.')
        }
        res.status(201).send(memKey);
    } catch (error) {
        console.log(chalk.red(errorLocation + " post | " + error));
        res.status(500).send({ message: "error occured during creation phrase", error });
    }
});


router.get('/:id', async (req, res) => {
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const washitsu = await readWashitsu(req);
        if (!washitsu) return res.status(404).send({ message: "No such washitsu in system" })
        res.status(200).send(washitsu);
    } catch (error) {
        console.log(errorLocation + " get single W " + error);
        res.status(500).send(error);
    }
});


router.patch('/:id', async (req, res) => {
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        if (req.body.roomName) {
            const existingWashitsu = await findWashitsuByName(req.body);
            if (existingWashitsu) {
                return res.status(403).send({ message: "This Washitsu ID already exists." });
            }
        }
        const attempt = checkForOccupantsChange(req.body);
        if (attempt) {
            return res.status(406).send({ message: "Cannot change occupants via this route." });
        }
        const WashitsuUpdates = await updateWashitsu(req);
        res.status(200).send(WashitsuUpdates);

    } catch (e) {
        console.log(errorLocation, e);
        res.status(500).send({ message: "Network Error" });
    }
});


router.delete('/:id_w', authWithJWT, async (req, res) => {
    let wUpdate;
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }

    try {
        let targetWashitsu = await readWashitsu(null, req.params.id_w); //internal usage only
        if (!targetWashitsu) {
            return res.status(404).send({ message: "Washitsu not found" });
        }
        if (targetWashitsu.occupants) { //Need to update occupant
            member = await readMember(null, parseInt(targetWashitsu.occupants))

            if (member.accountManager !== req.user.loginID) {
                console.log("--------user---------");
                console.log(req.user);
                console.log(member);
                console.log("Attempting to delete room occupy by non-beloning member");
                return res.status(403).send({ message: "Washitsu is currently occupied by someone. You are not authorized to access that occupant." })
            }
            uUpdate = await assignRoomToMember(member, "");
        }

        deletedWashitsu = await deleteWashitsu(null, targetWashitsu);
        if (!deletedWashitsu) {
            throw new Error("Cannot delete washitsu.")
        }

        res.status(204).send();

    } catch (error) {
        console.log(chalk.red(error))
        res.status(500).send(error);
    }
});

//Put a member into a room
router.put('/:id_w/member/:id_m', authWithJWT, async (req, res) => {
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    let washitsu;
    let member;
    try {
        //confirm that member exists
        member = await readMember(null, req.params.id_m, true);

        if (!member) { //exit if it does not
            return res.status(404).send({ message: "No such member" });
        }
        if (member.currentRoom === req.params.id || member.currentRoom) {
            return res.status(403).send({ message: "Member already in room or already assigned to another room" });
        }
        if (member.accountManager !== req.user.loginID) {
            console.log("-------------login ID mismatch--------------")
            console.log(member)
            console.log("----------and-----------------------------")
            console.log(req.user.loginID)
            return res.status(403).send({ message: "You are not authorized to do that." })
        }

        washitsu = await readWashitsu(null, req.params.id_w, true); //true : internal usage only
        if (!washitsu) { //No such washitsu . 404
            return res.status(404).send({ message: `Cannot find Washitsu of ID ${req.params.id_w}.` });
        }

        if (washitsu.occupants) {
            return res.status(403).send({ message: `Washitsu ${washitsu.roomName} is currently occupied.` })
        }

    } catch (error) {
        console.log(chalk.red(error));
        return res.status(500).send({ message: "Something happen during the verification phase. Try again later", error });
    }

    try {
        //update id along with boatID
        const wUpdate = await assignGuestToWashitsu(washitsu, member);
        const mUpdate = await assignRoomToMember(member, washitsu);
        if (!wUpdate[0] || !mUpdate[0]) {
            console.log("------------washitsu key----------");
            console.log(wUpdate);
            console.log("------------member key----------");
            console.log(mUpdate);
            throw new Error;
        }

        member = await readMember(null, req.params.id_m);
        washitsu = await readWashitsu(null, req.params.id_w);

        cloneMember = Object.assign({}, member);
        cloneWashitsu = Object.assign({}, washitsu);

        washitsu.occupants = cloneMember;
        member.currentRoom = cloneWashitsu;

        res.status(200).send([member, washitsu]);

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Network problem. Try again.", error });
    }
});

router.delete('/:id_w/member/:id_m', authWithJWT, async (req, res) => {
    //check if room exists
    //check if room has member that matches member id
    //update room to ""
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        let washitsu = await readWashitsu(null, req.params.id_w);
        if (!washitsu) {
            return res.status(404).send({ message: "No such washitsu" });
        }

        if (washitsu.occupants !== req.params.id_m) {
            return res.status(403).send({ message: "Washitsu does not have such occupant." });
        }

        let member = await readMember(null, req.params.id_m)
        if (member.accountManager !== req.user.loginID) {
            return res.status(403).send({ message: "You are not authorized to do this." })
        }

        const wUpdate = await assignGuestToWashitsu(washitsu, "");
        const mUpdate = await assignRoomToMember(member, "");
        if (!wUpdate[0] || !mUpdate[0]) {
            throw new Error;
        }

        washitsu = await readWashitsu(null, req.params.id_w, true);
        res.status(204).send(washitsu);
    } catch (error) {
        console.log(errorLocation + " delete relationship " + error);
        res.status(500).send({ message: "Network error..." });
    }
})

router.put('/', (req, res) => {
    res.status(405).set("Allow", "GET, POST").send({ message: "Please specify Washitsu ID to modify" });
})

router.delete('/', (req, res) => {
    res.status(405).set("Allow", "GET, POST").send({ message: "Please specify Washitsu ID to delete" });
})

router.post('/:id', (req, res) => {
    res.status(405).set("Allow", "DELETE, PUT").send({ message: "Method not allowed" });
})


module.exports = router;

// router.delete('/:id', async (req, res) => {
//     try {

//       // Checks if cargo exist on boat. Updates all cargo if yes.
//       let boat = await read(kind, req);
//       //console.log(boat);
//       if (!boat || !boat[0]) {
//         return res.status(404).send({ message: "Boat does not exist in system." });
//       }
//       boat = await removeCarrierFromAllCargos(req);
//       //console.log('Out of remove all', boat);

//       boat = await removeAllCargoFromBoat(req);
//       if (!boat) { console.log("Boat DELETE: does not have cargo"); }
//       boat = await remove(kind, req);
//       res.status(200).send({ message: "Sucessfully deleted object" });
//     } catch (e) {
//       // Cannot update cargo.
//       console.log(chalk.cyan(e));
//       res.status(500).send({ message: "Error while updating boat's carrier to null", e });
//     }
//   });