const express = require("express");
const router = express.Router();

const db = require("../src/db.js");

router.get("/:id", (req, res) => {
    let { id } = req.params;
    let link = db.get('links').find({ id }).value();
    if(link) {
        return res.redirect(link.url);
    }
    return res.redirect("/");
});

module.exports = router;