const express = require("express");
const crypto = require("crypto");
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
    limits: {
        fileSize: parseInt(process.env.MAXFILE) || 100*1024*1024,
        files: 1
    }
});

const db = require("../src/db.js");
const scopes = require("../src/scopes.js");
const websocket = require("../src/websocket.js");;

router.get("/logout", scopes.adminOnly, (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

/* Helper function for ShareX / Custom Integration functionality when not using the front-end */
const apiResponse = (req, res, message) => {
    if(req.headers.authorization) {
        return res.send(message);
    }
    else if(req.user) {
        return res.redirect("/admin?msg=" + encodeURIComponent(message));
    }
    return res.redirect("/");
};

router.post("/login", async (req, res) => {
    let { user, pass } = req.body; 
    let account = db.users.getUser(user);
    if(account && await bcrypt.compare(pass, account.pass)) {
        req.session.user = user;
        return res.redirect("/admin");
    }
    return res.redirect("/admin");
});

router.post("/shorten", scopes.hasScopeMiddleware("links"), (req, res) => {
    let { url, id } = req.body;
    if(!url) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing URL to shorten`));
    }
    if(!url.startsWith("https://") && !url.startsWith("http://")) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Invalid URL`));
    }

    id = db.links.addLink(id, url, req.user);
    return apiResponse(req, res, `${process.env.SITE}/u/${id}`);
});

router.post("/paste", scopes.hasScopeMiddleware("pastes"), (req, res) => {
    let { text, title, type, id, duration } = req.body;
    if(!text) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing text`));
    }
    type = type || "text/plain";
    let expire = 0, burn = 0;

    if(duration === "burn") {
        duration = 0;
        burn = 1;
    }

    id = db.pastes.addPaste(id, text, title, type, req.user, duration ?? 0, burn);
    return apiResponse(req, res, `${process.env.SITE}/p/${id}`);
});

router.post("/upload", [scopes.hasScopeMiddleware("upload"), upload.single('file')], (req, res) => {
    if(!req.file) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No file uploaded`));
    }

    let id = req.file.filename;
    req.body.id = req.body.id ? req.body.id.replace(/\.\./g, "") : "";
    if(req.body.id && !db.files.getId(req.body.id)) {
        id = req.body.id;
        fs.renameSync("./uploads/" + req.file.filename, "./uploads/" + req.body.id);
    }

    id = db.files.addFile(id, req.file.mimetype, req.file.originalname, req.user, req.body.duration ?? 0);
    return apiResponse(req, res, `${process.env.SITE}/f/${id}`);
});

router.post("/download", scopes.hasScopeMiddleware("download"), (req, res) => {
    let { url, id, duration } = req.body;
    if(!url) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing URL`));
    }

    let urlinfo;
    try {
        urlinfo = new URL(url);
    }
    catch(err) {
        return res.redirect("/admin?msg=" + encodeURIComponent(`Invalid URL`));
    }
    if(!['http:', 'https:'].includes(urlinfo.protocol)) {
        return res.redirect("/admin?msg=" + encodeURIComponent(`Invalid URL protocol`));
    }

    id = db.validID('files', id);
    
    let data = { url, id };
    if(duration && !isNaN(parseInt(duration))) {
        data.duration = parseInt(duration);
    }

    req.session.dl = data;
    return res.redirect("/admin?ws=1");
});

router.post("/delete", scopes.adminOnly, (req, res) => {
    let { table, item } = req.body;

    if(!table || !item) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing data to delete`));
    }

    if(!scopes.hasScope(req.user, table)) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: ${table}`));
    }

    if(!db.hasOwnProperty(table)) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Invalid table`));
    }

    let entry = db[table].getId(item);
    if(!entry) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No item found to delete`));
    }

    if(entry.user !== req.user.user && !scopes.hasScope(req.user, "superadmin")) {
        if(table !== "users" || (table === "users" && scopes.hasScope(entry.user, "superadmin"))) {
            return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No permission to delete that item`));
        }
    }

    if(table === "users" && entry.user === req.user.user) {
        req.session.destroy();
    }
    if(table === "files") {
        fs.rmSync("./uploads/" + entry.id);
    }

    db[table].delId(item);
    return res.redirect("/admin/db");
});

router.post("/adduser", scopes.adminOrEmptyDB, async (req, res) => {
    let { user, pass } = req.body;

    let users = db.users.getAll();
    if(users.length !== 0 && !scopes.hasScope(req.user, "users")) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: users`));
    }

    if(!user || !pass || !scopes) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing data to add user`));
    }

    if(db.users.getId(user)) {
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
    if(!scopes.hasScope(req.user, "superadmin")) {
        userScopes = userScopes.filter(s => scopes.hasScope(req.user, s));
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
    db.users.addUser(user, hash, userScopes);

    return res.redirect("/admin?msg=" + encodeURIComponent(`User ${user} added successfully`));
});

router.post("/token", scopes.adminOnly, (req, res) => {
    if(req.user.token) {
        db.users.delToken(req.user);
    }
    else {
        db.users.setToken(req.user, crypto.randomBytes(16).toString("hex"));
    }
    return res.redirect("/admin");
});

module.exports = router;