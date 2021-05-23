const db = require('better-sqlite3')('z3.db');
const crypto = require("crypto");

const bcrypt = require("bcrypt");

db.prepare(`CREATE TABLE IF NOT EXISTS users (
    user   TEXT UNIQUE,
    pass   TEXT,
    scopes TEXT,
    token  TEXT);`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS links (
    id   TEXT UNIQUE,
    url  TEXT,
    user TEXT,
    date INTEGER);`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS pastes (
    id     TEXT UNIQUE,
    text   TEXT,
    title  TEXT,
    type   TEXT,
    user   TEXT,
    date   INTEGER,
    expire INTEGER,
    burn   INTEGER);`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS files (
    id     TEXT UNIQUE,
    type   TEXT,
    name   TEXT,
    user   TEXT,
    date   INTEGER,
    expire INTEGER);`).run();

const randomID = (length) => {
    let result     = [];
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
    }
    return result.join('');
};

const randomIDForDB = (table, length, i = 0) => {
    if(i == 10) {
        return randomIDForDB(table, length + 1, 0);
    }
    let id = randomID(length);
    if(tables[table].getId(id)) {
        return randomIDForDB(table, length, i + 1);
    }
    return id;
};

const validID = (table, id, length = 4) => {
    if(!id || tables[table].getId(id)) {
        return randomIDForDB(table, length);
    }
    return id;
};

const stmts = {
    users: {
        addUser:  db.prepare(`INSERT INTO users (user, pass, scopes) VALUES (@user, @pass, @scopes);`),
        getUser:  db.prepare(`SELECT * FROM users WHERE user = @user;`),
        delUser:  db.prepare(`DELETE FROM users WHERE user = @user;`),
        delToken: db.prepare(`UPDATE users SET token = NULL WHERE user = @user;`),
        setToken: db.prepare(`UPDATE users SET token = @token WHERE user = @user;`),
        getToken: db.prepare(`SELECT * FROM users where token = @token;`),
        changePW: db.prepare(`UPDATE users SET pass = @pass WHERE user = @user`),
        getAll:   db.prepare(`SELECT * FROM users;`)
    },
    links: {
        addLink: db.prepare(`INSERT INTO links (id, url, user, date) VALUES (@id, @url, @user, strftime('%s', 'now'));`),
        getId:   db.prepare(`SELECT * FROM links WHERE id = @id;`),
        delId:   db.prepare(`DELETE FROM links WHERE id = @id;`),
        getAll:  db.prepare(`SELECT * FROM links;`)
    },
    pastes: {
        addPaste:  db.prepare(`INSERT INTO pastes (id, text, title, type, user, date, expire, burn) VALUES (@id, @text, @title, @type, @user, strftime('%s', 'now'), @expire, @burn);`),
        getId:     db.prepare(`SELECT * FROM pastes WHERE id = @id;`),
        delId:     db.prepare(`DELETE FROM pastes WHERE id = @id;`),
        delExpire: db.prepare(`DELETE FROM pastes WHERE expire != 0 AND expire < strftime('%s', 'now')`),
        getAll:    db.prepare(`SELECT * FROM pastes;`)
    },
    files: {
        addFile:   db.prepare(`INSERT INTO files (id, type, name, user, date, expire) VALUES (@id, @type, @name, @user, strftime('%s', 'now'), @expire);`),
        getId:     db.prepare(`SELECT * FROM files WHERE id = @id;`),
        delId:     db.prepare(`DELETE FROM files WHERE id = @id;`),
        getExpire: db.prepare(`SELECT * FROM files WHERE expire != 0 AND expire < strftime('%s', 'now')`),
        delExpire: db.prepare(`DELETE FROM files WHERE expire != 0 AND expire < strftime('%s', 'now')`),
        getAll:    db.prepare(`SELECT * FROM files;`)
    }
};

const users = {
    addUser: (user, pass, scopes) => {
        return stmts.users.addUser.run({ user, pass, scopes: JSON.stringify(scopes) });
    },
    getUser: (user) => {
        let entry = stmts.users.getUser.get({ user });
        if(entry) {
            entry.scopes = JSON.parse(entry.scopes);
        }
        return entry;
    },
    getId: (user) => {
        return users.getUser(user);
    },
    delId: (user) => {
        return stmts.users.delUser.run({ user });
    },
    delToken: (user) => {
        if(typeof user === "object") {
            user = user.user;
        }
        return stmts.users.delToken.run({ user });
    },
    setToken: (user, token) => {
        if(typeof user === "object") {
            user = user.user;
        }
        return stmts.users.setToken.run({ user, token });
    },
    changePW: (user, pass) => {
        if(typeof user === "object") {
            user = user.user;
        }
        return stmts.users.changePW.run({ user, pass });
    },
    getToken: (token) => {
        let entry = stmts.users.getToken.get({ token });
        if(entry) {
            entry.scopes = JSON.parse(entry.scopes);
        }
        return entry;
    },
    getAll: () => {
        return stmts.users.getAll.all().map(u => ({...u, scopes: JSON.parse(u.scopes) }));
    }
};

const links = {
    addLink: (id, url, user) => {
        if(typeof user === "object") {
            user = user.user;
        }
        id = validID('links', id);
        stmts.links.addLink.run({ id, url, user });
        return id;
    },
    getId: (id) => {
        return stmts.links.getId.get({ id })
    },
    delId: (id) => {
        return stmts.links.delId.run({ id });
    },
    getAll: () => {
        return stmts.links.getAll.all();
    }
};

const pastes = {
    addPaste: (id, text, title, type, user, expire = 0, burn = 0) => {
        if(typeof user === "object") {
            user = user.user;
        }
        if(expire !== 0) {
            expire = expire + parseInt(+new Date()/1000);
        }
        id = validID('pastes', id);
        stmts.pastes.addPaste.run({ id, text, title, type, user, expire, burn })
        return id;
    },
    getId: (id) => {
        return stmts.pastes.getId.get({ id })
    },
    delId: (id) => {
        return stmts.pastes.delId.run({ id });
    },
    delExpire: (id) => {
        return stmts.pastes.delExpire.run();
    },
    getAll: () => {
        return stmts.pastes.getAll.all();
    }
};

const files = {
    addFile: (id, type, name, user, expire = 0) => {
        if(typeof user === "object") {
            user = user.user;
        }
        if(expire !== 0) {
            expire = expire + parseInt(+new Date()/1000);
        }
        id = validID('files', id);
        stmts.files.addFile.run({ id, type, name, user, expire })
        return id;
    },
    getId: (id) => {
        return stmts.files.getId.get({ id })
    },
    delId: (id) => {
        return stmts.files.delId.run({ id });
    },
    getExpire: (id) => {
        return stmts.files.getExpire.all();
    },
    delExpire: (id) => {
        return stmts.files.delExpire.run();
    },
    getAll: () => {
        return stmts.files.getAll.all();
    }
};

const tables = {
    users,
    links,
    pastes,
    files
}

const getUserFromReq = (req) => {
    let user;
    if(req.session && req.session.user) {
        user = users.getUser(req.session.user);
    }
    if(req.headers.authorization) {
        user = users.getToken(req.headers.authorization.replace("Bearer ", "").trim());
    }
    return user;
};

module.exports = { ...tables, validID, randomIDForDB, getUserFromReq };