const express = require("express");
const router = express.Router();

const db = require("../src/db.js");

const adminOnly = function (req, res, next) {
    if(req.session.user) {
        return next();
    }
    return res.redirect("/");
};

router.get("/", (req, res) => {
    if(req.session.user) {
        return res.render("admin");
    }
    return res.render("login");
});

router.get("/db", adminOnly, (req, res) => {
    return res.render("db", { db: db.getState() });
});

module.exports = router;