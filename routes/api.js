const express = require("express");
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
    return res.redirect("/admin?msg=" + encodeURIComponent(`New URL: ${process.env.site}/u/${id}`));
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
    return res.redirect("/admin?msg=" + encodeURIComponent(`New paste: ${process.env.site}/p/${id}`));
});

router.post("/upload", [adminOnly, upload.single('file')], (req, res) => {
    if(!req.file) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No file uploaded`));
    }
    db.get('files').push({ 
        mimetype: req.file.mimetype,
        id: req.file.filename,
        name: req.file.originalname
    }).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`Uploaded file: ${process.env.site}/f/${req.file.filename}`));
});

router.post("/download", adminOnly, (req, res) => {
    let { url, id } = req.body;
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
    req.session.dl = { url, id };
    return res.redirect("/admin?ws=1");
});

const expirationCheck = () => {
    let time = +new Date();
    db.get('pastes').remove(p => p.expiration && time > p.expiration).write();
};
expirationCheck();
setInterval(expirationCheck, 60000);

module.exports = router;