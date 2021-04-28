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

/* delayed mode, redirects using HTML tags */
router.get("/:id/d", (req, res) => {
    let { id } = req.params;
    let link = db.get('links').find({ id }).value();
    if(link) {
        return res.send(`<meta http-equiv="refresh" content="0;url=${link.url.replace(/"/g, "")}" />`);
    }
    return res.redirect("/");
});


module.exports = router;