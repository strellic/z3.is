const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ users: [], shorten: [], paste: [], files: [] }).write();

db.randomID = (length) => {
    let result     = [];
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
    }
    return result.join('');
};

db.randomIDForDB = (name, length, i = 0) => {
    if(i == 10) {
        return db.randomIDForDB(name, length + 1, 0);
    }
    let id = db.randomID(length);
    if(db.get(name).find({ id }).value()) {
        return db.randomIDForDB(name, length, i + 1);
    }
    return id;
};

db.validID = (name, id, length = 4) => {
    if(!id || db.get(name).find({ id }).value()) {
        return db.randomIDForDB(name, length);
    }
    return id;
};

db.getUser = (req) => {
    let search = {};
    if(req.session.user) {
        search.user = req.session.user;
    }
    if(req.headers.authorization) {
        search.token = req.headers.authorization.replace("Bearer ", "").trim();
    }

    if(Object.keys(search).length === 0) {
        return;
    }

    return db.get('users').find(search).value();
};

module.exports = db;