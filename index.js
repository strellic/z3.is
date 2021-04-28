const express = require("express");
const app = express();

const PORT = 3200;

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ users: [], links: [], pastes: [], files: [] }).write();

const bcrypt = require('bcrypt');
const fs = require('fs');

const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const multer = require('multer');
const upload = multer({ 
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './uploads/');
        },
        filename: function (req, file, cb) {
            let id = randomID(6);
            while(fs.existsSync('./uploads/' + id)) {
                id = randomID(6);
            }
            cb(null, id);
        }
    }),
    limits: { fileSize: 100*1024*1024 }
});

app.use(express.urlencoded({ extended: false }));
app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    secret: require("crypto").randomBytes(32).toString("base64")
}));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get("/u/:id", (req, res) => {
    let { id } = req.params;
    let link = db.get('links').find({ id }).value();
    if(link) {
        return res.redirect(link.url);
    }
    return res.redirect("/");
});

app.get("/p/:id/d", (req, res) => {
    let { id } = req.params;
    let paste = db.get('pastes').find({ id }).value();
    if(paste) {
        res.setHeader('content-type', paste.type || 'text/plain');
        let name = (encodeURIComponent(paste.title) || encodeURIComponent(paste.id)) + ".txt";
        res.setHeader('Content-disposition', 'attachment; filename=' + name);
        return res.send(paste.text);
    }
    return res.redirect("/");
});
app.get("/p/:id/r", (req, res) => {
    let { id } = req.params;
    let paste = db.get('pastes').find({ id }).value();
    if(paste) {
        res.setHeader('content-type', paste.type || 'text/plain');
        return res.send(paste.text);
    }
    return res.redirect("/");
});
app.get("/p/:id", (req, res) => {
    let { id } = req.params;
    let paste = db.get('pastes').find({ id }).value();
    if(paste) {
        return res.render("paste", { ...paste });
    }
    return res.redirect("/");
});

app.get("/f/:id", (req, res) => {
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

const adminOnly = function (req, res, next) {
    if(req.session.user) {
        return next();
    }
};

app.get("/api/logout", adminOnly, (req, res) => {
    req.session.destroy();
    res.redirect("/");
})

app.post("/api/login", async (req, res) => {
    let { user, pass } = req.body; 
    let account = db.get('users').find({ user }).value();
    if(account && await bcrypt.compare(pass, account.pass)) {
        req.session.user = user;
        return res.redirect("/admin");
    }
    return res.redirect("/admin");
});

const randomID = (length) => {
    let result     = [];
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
    }
    return result.join('');
}

app.post("/api/shorten", adminOnly, (req, res) => {
    let { url, id } = req.body;
    if(!url) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing URL to shorten`));
    }

    id = id || randomID(6);
    while(db.get('links').find({ id }).value()) {
        id = randomID(6);
    }

    db.get('links').push({ url, id }).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`New URL: https://z3.is/u/${id}`));
});

app.post("/api/paste", adminOnly, (req, res) => {
    let { text, title, type, id } = req.body;
    if(!text || !type) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing title or type`));
    }

    id = id || randomID(6);
    while(db.get('pastes').find({ id }).value()) {
        id = randomID(6);
    }

    db.get('pastes').push({ text, title, type, id }).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`New paste: https://z3.is/p/${id}`));
});

app.post("/api/upload", [adminOnly, upload.single('file')], (req, res) => {
    if(!req.file) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`No file uploaded`));
    }

    if(req.file.size >= 100*1024*1024) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`File exceeds max size of 100MB`));
    }

    db.get('files').push({ 
        mimetype: req.file.mimetype,
        id: req.file.filename,
        name: req.file.originalname
    }).write();
    return res.redirect("/admin?msg=" + encodeURIComponent(`Uploaded file: https://z3.is/f/${req.file.filename}`));
});

app.get("/admin", (req, res) => {
    if(req.session.user) {
        return res.render("admin");
    }
    return res.render("login");
});

app.get("/", (req, res) => {
    res.render("index");
})

app.listen(PORT, () => {
    console.log(`[z3] z3.is listening on 0.0.0.0:${PORT}`);
});
