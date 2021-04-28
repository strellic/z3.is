const WebSocket = require('ws');
const url = require('url');

require("dotenv").config();

const signature = require("cookie-signature");
const cookie = require('cookie');

const download = require("./download.js")
const db = require("./db.js");

let wss;
let store;

const init = (server, s) => {
    wss = new WebSocket.Server({ server });
    store = s;

    wss.on('connection', (ws, req) => {
        let csid = cookie.parse(req.headers.cookie)["connect.sid"];
        if(csid) {
            let sid = signature.unsign(csid.slice("s:".length), process.env.SESSION_SECRET);
            store.get(sid, (err, session) => {
                if(err || !session || !session.user || !session.dl) {
                    return ws.close();
                }

                let { url, id } = session.dl; 
                ws.send(JSON.stringify({ title: `URL: ${process.env.SITE}/f/${id}` }));
                download.dl(url, id, (msg) => {
                    ws.send(JSON.stringify({ msg }));
                }, (file) => {
                    db.get('files').push(file).write();
                });
                store.set(sid, {...session, dl: null});
            });
        }
        else {
            ws.close();
        }
    });
};

module.exports = { init };