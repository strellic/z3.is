const express = require("express");
const url = require("url");

const router = express.Router();

const db = require("../src/db.js");

router.get("/:id/(*)", (req, res) => {
    let { id } = req.params;
    let link = db.links.getId(id);
    if(link) {
        return res.redirect(url.resolve(link.url, req.url.slice(`/${id}`.length)));
    }
    return res.redirect("/");
});

/* delayed mode, redirects using HTML tags */
router.get("/:id/d", (req, res) => {
    let { id } = req.params;
    let link = db.links.getId(id);
    if(link) {
        return res.send(`<meta http-equiv="refresh" content="0;url=${link.url.replace(/"/g, "")}" />`);
    }
    return res.redirect("/");
});


module.exports = router;