const express = require("express");
const fs = require("fs");
const app = express();

require("dotenv").config();

const PORT = parseInt(process.env.PORT) || 80;
const SITE = new URL(process.env.SITE).host;

const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const db = require("./src/db.js");
const scopes = require("./src/scopes.js");
const websocket = require("./src/websocket.js");
let { downloading } = require("./src/download.js");

const store = new MemoryStore({
    checkPeriod: 86400000
});

app.use(express.urlencoded({ extended: false }));
app.use(session({
    cookie: { maxAge: 86400000 },
    store,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET
}));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.locals.site = SITE;
app.locals.hasScope = scopes.hasScope;

app.use("/admin", require("./routes/admin.js"));
app.use("/api", require("./routes/api.js"));

app.use("/p", require("./routes/p.js"));
app.use("/u", require("./routes/u.js"));
app.use("/f", require("./routes/f.js"));

app.get("/", (req, res) => {
    res.render("index");
});

app.use((err, req, res, next) => {
    console.log(err);
    if(req.user) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(err.message));
    }
    return res.redirect("/");
});

const expirationCheck = () => {
    let time = +new Date();
    db.pastes.delExpire();

    let list = fs.readdirSync("./uploads").filter(s => s[0] !== ".");
    let ids = db.files.getAll().map(f => f.id);

    ids = ids.filter(i => !downloading.includes(i));

    let unexpected = list.filter(f => !ids.includes(f));
    let expired = db.files.getExpire().map(f => f.id);
    let remove = expired.concat(unexpected);

    db.files.delExpire();
    for(let file of remove) {
        fs.rmSync("./uploads/" + file);
    }
};
expirationCheck();
setInterval(expirationCheck, 60000);

let server = app.listen(PORT, () => {
    console.log(`[z3] ${SITE} listening on 0.0.0.0:${PORT}`);
});
websocket.init(server, store);