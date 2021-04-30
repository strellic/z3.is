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
    if(db.getUser(req)) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(err.message));
    }
    return res.redirect("/");
});

const expirationCheck = () => {
    let time = +new Date();
    db.get('paste').remove(p => p.expiration && time > p.expiration).write();

    let list = fs.readdirSync("./uploads").filter(f => f != ".gitkeep");
    let ids = db.get('files').value().map(f => f.id);

    let unexpected = list.filter(f => !ids.includes(f));
    let expired = db.get('files').filter(f => f.expiration && time > f.expiration).value().map(f => f.id);
    let remove = expired.concat(unexpected);

    for(let file of remove) {
        fs.rmSync("./uploads/" + file);
    }
    db.get('files').remove(f => f.expiration && time > f.expiration).write();
};
expirationCheck();
setInterval(expirationCheck, 60000);

let server = app.listen(PORT, () => {
    console.log(`[z3] ${SITE} listening on 0.0.0.0:${PORT}`);
});
websocket.init(server, store);