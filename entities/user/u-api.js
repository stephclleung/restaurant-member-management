var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
//debug
const chalk = require('chalk');
router.use(bodyParser.json());

const kind = 'user';
const errorLocation = "User Api | ... ";
const { jsonCheck, generateJWT, authWithJWT } = require('../../utils/utils');
const {
    createUser,
    readAllUser,
    readUser,
    findUserByloginID,
    findAccountsByUser,
    updateUser,
    deleteUser,
    assignGuestToUser
} = require('./u-model-datastore');

router.get('/', async (req, res) => {
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const allUsers = await readAllUser(req);
        res.status(200).send(allUsers);
    } catch (error) {
        console.log(errorLocation + error);
        res.status(400).send(error);
    }
});


router.post('/', async (req, res) => {
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        const existingMember = await findUserByloginID(req.body);
        if (existingMember) {
            return res.status(400).send({ message: "This staff user already exists." });
        }
        const userKey = await createUser(req.body);
        if (!userKey) {
            return res.status(400).send({ message: "Missing user properties" });
        }
        res.status(201).send(userKey);
    } catch (error) {
        console.log(chalk.red(errorLocation + error));
        res.status(500).send({ message: "error occured during creation phrase", error });
    }
});

router.post('/login', async (req, res) => {
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        //Find by credentials
        const user = await findUserByloginID(req.body);
        if (!user || user.password !== req.body.password) {
            return res.status(401).send({ message: "Invalid credentials | No such user." });
        }

        //gen token. 
        let results = await generateJWT(user); // [user, token];
        if (!results) { throw new Error("Failed to generate JWT ") }

        let userKey = await updateUser(null, results.user)

        //send both back.
        res.status(200).send({ message: "Successfully logged in.", token: results.token })
    } catch (e) {
        console.log(errorLocation + " login | " + e)
        res.status(500).send({ message: "Network error" });
    }
});

router.get('/:id/accounts', authWithJWT, async (req, res) => {
    if (!jsonCheck(req)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {
        let user = await readUser(req, null, true);
        let userAccounts = await findAccountsByUser(user);
        // user.accounts = userAccounts;
        if (!userAccounts) {
            userAccounts = [];
        }
        res.status(200).send(userAccounts);
    } catch (error) {
        console.log(errorLocation + error);
        res.status(500).send(error);
    }
});


router.delete('/:id', async (req, res) => {
    if (!jsonCheck(req, res)) {
        return res.status(406).send({ message: "Requests can only be in JSON. Please specify in header" }); //406 when neither
    }
    try {

        let deletedUser = await deleteUser(req.params.id);
        //console.log(deletedUser)
        if (!deletedUser) {
            return res.status(404).send({ message: "Staff user not found" });
        }
        res.status(204).send();

    } catch (error) {
        console.log(chalk.red(error))
        res.status(500).send(error);
    }
});

router.put('/', (req, res) => {
    res.status(405).set("Allow", "GET, POST").send({ message: "Please specify user ID to modify" });
})

router.delete('/', (req, res) => {
    res.status(405).set("Allow", "GET, POST").send({ message: "Please specify user ID to delete" });
})

router.post('/:id', (req, res) => {
    res.status(405).set("Allow", "DELETE, PUT").send({ message: "Method not allowed" });
})

module.exports = router;