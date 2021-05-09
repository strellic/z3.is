const db = require("./db.js");

// list of scopes
// superadmin
// users
// shorten
// paste
// upload   --> files db
// download --> files db

const scopes = ["superadmin", "users", "links", "pastes", "upload", "download"];

const hasScope = (user, role) => {
    if(typeof user !== "object") {
        // hasScope can take user object or username string
        user = db.users.getUser(user);
    }
    if(!user || !user.scopes) 
        return false;
    return user.scopes.includes("superadmin") || user.scopes.includes(role);
};

const hasScopeMiddleware = (scope) => {
    return (req, res, next) => {
        let user;
        if(req.session.user) {
            user = db.users.getUser(req.session.user);
        }
        if(req.headers.authorization) {
            user = db.users.getToken(req.headers.authorization.replace("Bearer ", "").trim());
        }

        if(!user) {
            return next();
        }
        req.user = user;

        if (!hasScope(user, scope)) {
            return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: ${scope}`));
        }
        return next();
    }
};

const adminOnly = function (req, res, next) {
    let user;
    if(req.session.user) {
        user = db.users.getUser(req.session.user);
    }
    if(req.headers.authorization) {
        user = db.users.getToken(req.headers.authorization.replace("Bearer ", "").trim());
    }

    if(!user) {
        return res.redirect("/");
    }
    req.user = user;
    return next();
};

const adminOrEmptyDB = function (req, res, next) {
    let users = db.users.getAll();

    let user;
    if(req.session.user) {
        user = db.users.getUser(req.session.user);
    }
    if(req.headers.authorization) {
        user = db.users.getToken(req.headers.authorization.replace("Bearer ", "").trim());
    }

    if(!user && users.length !== 0) {
        return res.redirect("/");
    }
    if(user) {
        req.user = user;
    }
    return next();
}

module.exports = { adminOnly, hasScope, hasScopeMiddleware, adminOrEmptyDB, scopes };