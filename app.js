
const express = require('express');
const app = express();

const bodyparser = require('body-parser');
const washitsuRouter = require('./entities/washitsu/w-api');
const MemberRouter = require('./entities/member/m-api');
const staffRouter = require('./entities/user/u-api');



app.use(bodyparser.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send("leungst - OSU CS 493 - Final Project : Super Formal Japanese Restaurant with Tons of Private Dining Rooms. ")
})

app.get('/liveness_check', () => {
    res.status(200).send();
})

app.get('/readiness_check', () => {
    res.status(200).send();
})

app.get('/_ah/health', () => {
    console.log("Caught the health check?")
    res.status(200).send();
})

app.use('/washitsu', washitsuRouter);
app.use('/member', MemberRouter);
app.use('/user', staffRouter);

let PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Application running on ", PORT);
})

module.exports = app;


/**
//Remaining todo :
 * -Delete route's testing
    -totalUsers
    -total Member
    -total washitsu
 *
 */


