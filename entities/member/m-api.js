var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');

//debug
const chalk = require('chalk');
router.use(bodyParser.json());


const { createMember, readAllMembers, readMember, findMemberByID, updateMember, deleteMember } = require('./m-model-datastore');
const { readWashitsu, assignGuestToWashitsu } = require('../washitsu/w-model-datastore')
const { jsonCheck, authWithJWT } = require('../../utils/utils');
const errorLocation = "M-API.js | ... ";


router.get('/', authWithJWT, async (req, res) => {
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const allMembers = await readAllMembers(req);
        res.status(200).send(allMembers);
    } catch (error) {
        console.log(errorLocation + error);
        res.status(400).send(error);
    }
});


router.post('/', authWithJWT, async (req, res) => {

    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const existingMember = await findMemberByID(req.body);
        if (existingMember) {
            return res.status(400).send({ message: "This member already exists." });
        }
        const memKey = await createMember(req.body, req.user);
        if (!memKey) {
            throw new Error('error during creating a new member.')
        }

        res.status(201).send(memKey);
    } catch (error) {
        console.log(chalk.red(errorLocation + error));
        res.status(500).send({ message: "error occured during creation phrase", error });
    }
});


router.get('/:id', async (req, res) => {
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const member = await readMember(req);
        if (!member) res.status(404).send({ message: "Member not found" })
        res.status(200).send(member);
    } catch (error) {
        console.log(errorLocation + error);
        res.status(400).send(error);
    }
});


router.patch('/:id_m', authWithJWT, async (req, res) => {
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        if (req.body.membershipID) {
            const existingMember = await findMemberByID(req.body);

            if (existingMember) {
                return res.status(403).send({ message: "This member ID already exists." });
            }
        }

        let member = await readMember(null, req.params.id_m, true);
        if (member.accountManager !== req.user.loginID) {
            return res.status(403).send({ message: "You are not authorized to do that." })
        }

        const memberUpdates = await updateMember(req, member);

        member = await readMember(null, req.params.id_m)
        res.status(200).send(member);

    } catch (e) {
        console.log(errorLocation, e);
        res.status(500).send({ message: "Network error" });
    }
});


router.delete('/:id_m', authWithJWT, async (req, res) => {
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }

    try {
        let targetMember = await readMember(null, req.params.id_m); //internal usage only
        if (!targetMember) {
            return res.status(404).send({ message: "Member not found" });
        }
        if (targetMember.accountManager !== req.user.loginID) {
            console.log("----------user------------")
            console.log(req.user);
            return res.status(403).send({ message: "You are not authorized to do that." });
        }
        if (targetMember.currentRoom) { //Need to update occupant
            washitsu = await readWashitsu(null, parseInt(targetMember.currentRoom))
            wUpdate = await assignGuestToWashitsu(washitsu, "");
        }

        deletedMember = await deleteMember(null, targetMember);
        if (!deletedMember) {
            throw new Error("Cannot delete washitsu.")
        }

        res.status(204).send();
    } catch (e) {
        console.log(errorLocation + " " + e);
        res.status(500).send({ message: "Network error occured" })
    }
});



router.put('/', (req, res) => {
    res.status(405).set("Allow", "GET, POST").send({ message: "Please specify Member ID to modify" });
})

router.delete('/', (req, res) => {
    res.status(405).set("Allow", "GET, POST").send({ message: "Please specify Member ID to delete" });
})

router.post('/:id', (req, res) => {
    res.status(405).set("Allow", "DELETE, PUT").send({ message: "Method not allowed" });
})


module.exports = router;