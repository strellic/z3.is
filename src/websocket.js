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
                req.session = session;
                let user = db.getUserFromReq(req);
                if(err || !session || !user || !session.dl) {
                    ws.send(JSON.stringify({ msg: "Something went wrong with the download process." }));
                    return ws.close();
                }

                let { url, id, duration } = session.dl; 
                ws.send(JSON.stringify({ title: `URL: ${process.env.SITE}/f/${id}` }));
                let stopper = download.dl(url, id, (msg) => {
                    ws.send(JSON.stringify({ msg }));
                }, (file) => {
                    ws.send(JSON.stringify({ done: true }));
                    db.files.addFile(id, file.mimetype, file.name, user, duration ?? 0);
                    ws.close();
                });
                store.set(sid, {...session, dl: null});

                ws.on('message', () => {
                    ws.send(JSON.stringify({ done: true }));
                    stopper();
                    ws.close();
                });
            });
        }
        else {
            ws.close();
        }
    });
};

module.exports = { init };