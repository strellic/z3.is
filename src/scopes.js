const db = require("./db.js");

// list of scopes
// superadmin
// users
// shorten
// paste
// upload   --> files db
// download --> files db

const scopes = ["superadmin", "users", "shorten", "paste", "upload", "download"];

const hasScope = (user, role) => {
    let dbUser = db.get('users').find({ user }).value();
    if(!dbUser || !dbUser.scopes) 
        return false;
    return dbUser.scopes.includes("superadmin") || dbUser.scopes.includes(role);
};

const hasScopeMiddleware = (scope) => {
    return (req, res, next) => {
        if(!req.session.user) {
            return res.redirect("/");
        }
        if (!hasScope(req.session.user, scope)) {
            return res.redirect("/admin?title=Error&msg=" + encodeURIComponent(`Missing scope: ${scope}`));
        }
        return next();
    }
};

const adminOnly = function (req, res, next) {
    if(req.session.user) {
        return next();
    }
    return res.redirect("/");
};

module.exports = { adminOnly, hasScope, hasScopeMiddleware, scopes };