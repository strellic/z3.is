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
            let id = db.randomIDForDB('files', 4);
            cb(null, id);
        }
    }),
    limits: { fileSize: parseInt(process.env.MAXFILE) || 100*1024*1024 }
});

const db = require("../src/db.js");
const scopes = require("../src/scopes.js");
const websocket = require("../src/websocket.js");;

router.get("/logout", scopes.adminOnly, (req, res) => {
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

router.post("/shorten", scopes.hasScopeMiddleware("shorten"), (req, res) => {
    let user = req.session.user;
    let { url, id } = req.body;
    if(!url) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing URL to shorten`));
    }

    id = db.validID('shorten', id);
    db.get('shorten').push({ url, id, user }).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`New URL: ${process.env.SITE}/u/${id}`));
});

router.post("/paste", scopes.hasScopeMiddleware("paste"), (req, res) => {
    let user = req.session.user;
    let { text, title, type, id, duration } = req.body;
    if(!text || !type) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing title or type`));
    }
    id = db.validID('paste', id);

    let paste = { text, title, type, id, user };

    if(duration === "burn") {
        paste.burn = true;
    }
    else if(duration && !isNaN(parseInt(duration))) {
        duration = parseInt(duration);
        paste.expiration = +new Date() + duration*1000;
    }

    db.get('paste').push(paste).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`New paste: ${process.env.SITE}/p/${id}`));
});

router.post("/upload", [scopes.hasScopeMiddleware("upload"), upload.single('file')], (req, res) => {
    let user = req.session.user;
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
        name: req.file.originalname,
        user
    };

    if(req.body.duration && !isNaN(parseInt(req.body.duration))) {
        let duration = parseInt(req.body.duration);
        file.expiration = +new Date() + duration*1000;
    }

    db.get('files').push(file).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`Uploaded file: ${process.env.SITE}/f/${id}`));
});

router.post("/download", scopes.hasScopeMiddleware("download"), (req, res) => {
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

router.post("/delete", scopes.adminOnly, (req, res) => {
    let { table, json } = req.body;
    let user = req.session.user;

    if(!table || !json) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing data to delete`));
    }

    if(!scopes.hasScope(user, table)) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: ${table}`));
    }

    try {
        json = JSON.parse(json);
    }
    catch(err) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Invalid item to delete`));
    }

    if(!db.has(table).value()) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Invalid table`));
    }

    let item = db.get(table).find(json).value();
    if(!item) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No item found to delete`));
    }

    if(item.user !== req.session.user && !scopes.hasScope(req.session.user, "superadmin")) {
        if(table !== "users") {
            return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No permission to delete that item`));
        }
        else {
            let target = item.user;
            if(scopes.hasScope(target, "superadmin")) {
                return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No permission to delete that item`));
            }
        }
    }

    if(table === "users" && item.user === req.session.user) {
        req.session.destroy();
    }

    if(table === "files") {
        fs.rmSync("./uploads/" + item.id);
    }
    db.get(table).remove(json).write();
    return res.redirect("/admin/db");
});

router.post("/adduser", async (req, res) => {
    let { user, pass } = req.body;

    let users = db.get('users').value();
    if(users.length !== 0 && !scopes.hasScope(req.session.user, "users")) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: users`));
    }

    if(!user || !pass || !scopes) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing data to add user`));
    }

    if(db.get('users').add({ user }).value()) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`User already exists`));
    }

    let userScopes = [];
    try {
        userScopes = JSON.parse(req.body.scopes);
        if(!Array.isArray(userScopes)) {
            userScopes = [];
        }
    }
    catch(err) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Invalid scopes for user`));
    }

    userScopes = userScopes.filter(s => scopes.scopes.includes(s));
    if(!scopes.hasScope(req.session.user, "superadmin")) {
        userScopes = userScopes.filter(s => scopes.hasScope(req.session.user, s));
    }

    if(users.length === 0 || userScopes.includes("superadmin")) {
        userScopes = ["superadmin"];
    }

    if(userScopes.length === 0) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Invalid scopes for user`));
    }

    let hash = await bcrypt.hash(pass, 14);
    if(users.length === 0) {
        req.session.user = user;
    }
    db.get('users').push({ user, pass: hash, scopes: userScopes }).write();

    return res.redirect("/admin?msg=" + encodeURIComponent(`User ${user} added successfully`));
});

const expirationCheck = () => {
    let time = +new Date();
    db.get('paste').remove(p => p.expiration && time > p.expiration).write();
    
    let files = db.get('files').filter(f => f.expiration && time > f.expiration).value();
    for(let file of files) {
        fs.rmSync("./uploads/" + file.id);
    }
    db.get('files').remove(f => f.expiration && time > f.expiration).write();
};
expirationCheck();
setInterval(expirationCheck, 60000);

module.exports = router;