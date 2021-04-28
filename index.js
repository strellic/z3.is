const express = require("express");
const app = express();

require("dotenv").config();

const PORT = parseInt(process.env.PORT) || 80;
const SITE = new URL(process.env.SITE).host;

const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const db = require("./src/db.js");
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

app.use("/api", require("./routes/api.js"));
app.use("/p", require("./routes/p.js"));
app.use("/u", require("./routes/u.js"));
app.use("/f", require("./routes/f.js"));

app.get("/admin", (req, res) => {
    if(req.session.user) {
        return res.render("admin");
    }
    return res.render("login");
});

app.get("/", (req, res) => {
    res.render("index");
});

let server = app.listen(PORT, () => {
    console.log(`[z3] ${SITE} listening on 0.0.0.0:${PORT}`);
});
websocket.init(server, store);