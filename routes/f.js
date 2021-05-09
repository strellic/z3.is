const express = require("express");
const router = express.Router();
const fs = require("fs");

const db = require("../src/db.js");

router.get("/:id", (req, res) => {
    let { id } = req.params;
    let file = db.files.getId(id);
    if(file) {
        let name = file.name || file.id;
        res.setHeader("Content-Type", file.type);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(name)}"`);
        res.setHeader("Content-Length", fs.statSync("./uploads/" + id).size);
        return fs.createReadStream("./uploads/" + id).pipe(res);
    }
    return res.redirect("/");
});

module.exports = router;