const express = require("express");
const fs = require("fs");

const router = express.Router();

require("dotenv").config();

const bcrypt = require('bcrypt');

const multer = require('multer');
const upload = multer({ 
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './uploads/');
        },
        filename: function (req, file, cb) {
            let id = db.randomIDForDB('files', 6);
            cb(null, id);
        }
    }),
    limits: { fileSize: parseInt(process.env.MAXFILE) || 100*1024*1024 }
});

const db = require("../src/db.js");
const websocket = require("../src/websocket.js");;

const adminOnly = function (req, res, next) {
    if(req.session.user) {
        return next();
    }
    return res.redirect("/");
};

router.get("/logout", adminOnly, (req, res) => {
    req.session.destroy();
    res.redirect("/");
})

router.post("/login", async (req, res) => {
    let { user, pass } = req.body; 
    let account = db.get('users').find({ user }).value();
    if(account && await bcrypt.compare(pass, account.pass)) {
        req.session.user = user;
        return res.redirect("/admin");
    }
    return res.redirect("/admin");
});

router.post("/shorten", adminOnly, (req, res) => {
    let { url, id } = req.body;
    if(!url) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing URL to shorten`));
    }

    id = db.validID('links', id);
    db.get('links').push({ url, id }).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`New URL: ${process.env.SITE}/u/${id}`));
});

router.post("/paste", adminOnly, (req, res) => {
    let { text, title, type, id, duration } = req.body;
    if(!text || !type) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing title or type`));
    }
    id = db.validID('pastes', id);

    let paste = { text, title, type, id };

    if(duration === "burn") {
        paste.burn = true;
    }
    else if(duration && !isNaN(parseInt(duration))) {
        duration = parseInt(duration);
        paste.expiration = +new Date() + duration*1000;
    }

    db.get('pastes').push(paste).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`New paste: ${process.env.SITE}/p/${id}`));
});

router.post("/upload", [adminOnly, upload.single('file')], (req, res) => {
    if(!req.file) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No file uploaded`));
    }

    let id = req.file.filename;
    if(req.body.id && !db.get('files').find({ id: req.body.id }).value()) {
        id = req.body.id;
        fs.rename("./uploads/" + req.file.filename, "./uploads/" + req.body.id, () => {});
    }

    let file = { 
        mimetype: req.file.mimetype,
        id,
        name: req.file.originalname
    };

    if(req.body.duration && !isNaN(parseInt(req.body.duration))) {
        let duration = parseInt(req.body.duration);
        file.expiration = +new Date() + duration*1000;
    }

    db.get('files').push(file).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`Uploaded file: ${process.env.SITE}/f/${id}`));
});

router.post("/download", adminOnly, (req, res) => {
    let { url, id, duration } = req.body;
    if(!url) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing URL`));
    }
    id = db.validID('files', id);

    let urlinfo;
    try {
        urlinfo = new URL(url);
    }
    catch(err) {
        return res.redirect("/admin?msg=" + encodeURIComponent(`Invalid URL`));
    }
    if(!['http:', 'https:', 'ftp:'].includes(urlinfo.protocol)) {
        return res.redirect("/admin?msg=" + encodeURIComponent(`Invalid URL protocol`));
    }

    let data = { url, id };
    if(duration && !isNaN(parseInt(duration))) {
        data.duration = parseInt(duration);
    }

    req.session.dl = data;
    return res.redirect("/admin?ws=1");
});

router.post("/delete", adminOnly, (req, res) => {
    let { table, json } = req.body;
    if(!table || !json) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing data to delete`));
    }

    try {
        json = JSON.parse(json);
    }
    catch(err) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Invalid item to delete`));
    }

    db.get(table).remove(json).write();
    return res.redirect("/admin/db");
});

const expirationCheck = () => {
    let time = +new Date();
    db.get('pastes').remove(p => p.expiration && time > p.expiration).write();
    
    let files = db.get('files').filter(f => f.expiration && time > f.expiration).value();
    for(let file of files) {
        fs.rmSync("./uploads/" + file.id);
    }
    db.get('files').remove(f => f.expiration && time > f.expiration).write();
};
expirationCheck();
setInterval(expirationCheck, 60000);

module.exports = router;