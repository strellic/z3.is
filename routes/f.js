const express = require("express");
const router = express.Router();
const fs = require("fs");

const db = require("../src/db.js");

router.get("/:id", (req, res) => {
    let { id } = req.params;
    let file = db.get('files').find({ id }).value();
    if(file) {
        let name = file.name || file.id;
        res.setHeader("Content-Type", file.mimetype);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(name)}"`);
        return fs.createReadStream("./uploads/" + id).pipe(res);
    }
    return res.redirect("/");
});

module.exports = router;