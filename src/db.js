const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ users: [], links: [], pastes: [], files: [] }).write();

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

db.validID = (name, id, length = 6) => {
    if(!id || db.get(name).find({ id }).value()) {
        return db.randomIDForDB(name, length);
    }
    return id;
};

module.exports = db;