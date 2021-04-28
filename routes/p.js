const express = require("express");
const router = express.Router();

const db = require("../src/db.js");

router.get("/:id/d", (req, res) => {
    let { id } = req.params;
    let paste = db.get('pastes').find({ id }).value();
    if(paste) {
        if(paste.burn) {
            db.get('pastes').remove({ id }).write();
        }

        res.setHeader('content-type', paste.type || 'text/plain');
        let name = (encodeURIComponent(paste.title) || encodeURIComponent(paste.id)) + ".txt";
        res.setHeader('Content-disposition', 'attachment; filename=' + name);
        return res.send(paste.text);
    }
    return res.redirect("/");
});

router.get("/:id/r", (req, res) => {
    let { id } = req.params;
    let paste = db.get('pastes').find({ id }).value();
    if(paste) {
        if(paste.burn) {
            db.get('pastes').remove({ id }).write();
        }

        res.setHeader('content-type', paste.type || 'text/plain');
        return res.send(paste.text);
    }
    return res.redirect("/");
});

router.get("/:id", (req, res) => {
    let { id } = req.params;
    let paste = db.get('pastes').find({ id }).value();
    if(paste) {
        if(paste.burn) {
            if(!req.query.confirm) {
                return res.render("paste", { paste: { confirm: true, id } });
            }
            db.get('pastes').remove({ id }).write();
        }
        return res.render("paste", { paste });
    }
    return res.redirect("/");
});

module.exports = router;