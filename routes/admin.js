const express = require("express");
const router = express.Router();

const db = require("../src/db.js");
const scopes = require("../src/scopes.js");

router.get("/", (req, res) => {
    let user = db.getUserFromReq(req);
    if(user) {
        return res.render("admin", { user: user.user, scopes: user.scopes, token: user.token });
    }
    if(db.users.getAll().length === 0) {
        return res.redirect("/admin/adduser");
    }
    return res.render("login");
});

router.get("/db", scopes.adminOnly, (req, res) => {
    let state = {
        users:  db.users.getAll(),
        links:  db.links.getAll(),
        pastes: db.pastes.getAll(),
        files:  db.files.getAll()
    };
    let allowed = {};

    if(scopes.hasScope(req.user, 'users')) 
        allowed.users = state.users.map(u => ({...u, pass: undefined, token: undefined}));
    if(scopes.hasScope(req.user, 'links'))
        allowed.links = state.links.reverse();
    if(scopes.hasScope(req.user, 'pastes'))
        allowed.pastes = state.pastes.reverse();
    if(scopes.hasScope(req.user, 'upload') || scopes.hasScope(req.user, 'download'))
        allowed.files = state.files.reverse();

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

router.get("/adduser", scopes.adminOrEmptyDB, (req, res) => {
    let users = db.users.getAll();

    if(users.length !== 0 && !scopes.hasScope(req.user, 'users')) {
        return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: users`));
    }

    let allScopes = scopes.scopes;
    if(users.length !== 0 && !scopes.hasScope(req.user, 'superadmin')) {
        allScopes = allScopes.filter(s => scopes.hasScope(req.user, s))
    }

    return res.render("adduser", { 
        user: req.user?.user,
        scopes: allScopes,
        first: users.length === 0
    });
});

router.get("/changepw", scopes.adminOnly, (req, res) => {
    res.render("changepw");
});

module.exports = router;