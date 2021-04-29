const express = require("express");
const router = express.Router();

const db = require("../src/db.js");
const scopes = require("../src/scopes.js");

const adminOnly = function (req, res, next) {
    if(req.session.user) {
        return next();
    }
    return res.redirect("/");
};

router.get("/", (req, res) => {
    if(req.session.user) {
        return res.render("admin", { user: req.session.user });
    }
    if(db.get("users").value().length === 0) {
        return res.redirect("/admin/adduser");
    }
    return res.render("login");
});

router.get("/db", adminOnly, (req, res) => {
    let user = req.session.user;
    let state = db.getState();
    let allowed = {};

    if(scopes.hasScope(user, 'users')) 
        allowed.users = state.users.map(u => ({...u, pass: undefined}));
    if(scopes.hasScope(user, 'shorten'))
        allowed.shorten = state.shorten;
    if(scopes.hasScope(user, 'paste'))
        allowed.paste = state.paste;
    if(scopes.hasScope(user, 'upload') || scopes.hasScope(user, 'download'))
        allowed.files = state.files;

    if(!scopes.hasScope(user, 'superadmin')) {
        for(let key of Object.keys(allowed)) {
            if(key === "users") {
                allowed[key] = allowed[key].map(u => scopes.hasScope(u.user, 'superadmin') ? {...u, disabled: true} : u );
            }
            else {
                allowed[key] = allowed[key].filter(item => item.user === user);
            }
        }
    }

    return res.render("db", { user, db: allowed });
});

router.get("/adduser", (req, res) => {
    let user = req.session.user;
    let users = db.get("users").value();
    if(!user && users.length !== 0) {
        return res.redirect("/");
    }
    if(!scopes.hasScope(user, 'users') && users.length !== 0) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: users`));
    }

    let allScopes = scopes.scopes;
    if(!scopes.hasScope(user, 'superadmin'))
        allScopes = allScopes.filter(s => s !== "superadmin")

    return res.render("adduser", { 
        user,
        scopes: allScopes,
        first: users.length === 0
    });
});

module.exports = router;