const express = require("express");
const router = express.Router();

const db = require("../src/db.js");
const scopes = require("../src/scopes.js");

router.get("/", (req, res) => {
    let user = db.getUser(req);
    if(user) {
        return res.render("admin", { user: user.user, scopes: user.scopes, token: user.token });
    }
    if(db.get("users").value().length === 0) {
        return res.redirect("/admin/adduser");
    }
    return res.render("login");
});

router.get("/db", scopes.adminOnly, (req, res) => {
    let state = db.getState();
    let allowed = {};

    if(scopes.hasScope(req.user, 'users')) 
        allowed.users = state.users.map(u => ({...u, pass: undefined}));
    if(scopes.hasScope(req.user, 'shorten'))
        allowed.shorten = state.shorten;
    if(scopes.hasScope(req.user, 'paste'))
        allowed.paste = state.paste;
    if(scopes.hasScope(req.user, 'upload') || scopes.hasScope(req.user, 'download'))
        allowed.files = state.files;

    if(!scopes.hasScope(req.user, 'superadmin')) {
        for(let key of Object.keys(allowed)) {
            if(key === "users") {
                allowed[key] = allowed[key].map(u => scopes.hasScope(u, 'superadmin') ? {...u, disabled: true} : u );
            }
            else {
                allowed[key] = allowed[key].filter(item => item.user === req.user.user);
            }
        }
    }

    return res.render("db", { user: req.user.user, db: allowed });
});

router.get("/adduser", (req, res) => {
    let users = db.get("users").value();
    if(!req.user && users.length !== 0) {
        return res.redirect("/");
    }
    if(!scopes.hasScope(req.user, 'users') && users.length !== 0) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: users`));
    }

    let allScopes = scopes.scopes;
    if(!scopes.hasScope(req.user, 'superadmin')) {
        allScopes = allScopes.filter(s => scopes.hasScope(req.user, s))
    }

    return res.render("adduser", { 
        user: req.user.user,
        scopes: allScopes,
        first: users.length === 0
    });
});

module.exports = router;