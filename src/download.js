const https = require('https');
const http = require('http');
const fs = require('fs');

require("dotenv").config();

let maxDownload = -1;
if(process.env.MAXDOWNLOAD && !isNaN(parseInt(process.env.MAXDOWNLOAD))) {
    maxDownload = parseInt(process.env.MAXDOWNLOAD);
}

const dl = (url, id, statusCb, onDone) => {
    let request;
    let file = fs.createWriteStream("./uploads/" + id);

    let timer = setTimeout(() => {
        request.abort();
        statusCb("The download timed out.");
    }, 10000);

    let getFn = http.get;
    if(url.startsWith("https:")) {
        getFn = https.get;
    }

    request = getFn(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246',
        }
    }).on('response', function(res) {
        let len = parseInt(res.headers['content-length']);

        if(maxDownload !== -1 && len > maxDownload) {
            statusCb('The file exceeds the max download size.');
            request.abort();
            clearTimeout(timer);
        }

        let downloaded = 0;
            
        res.on('data', function(chunk) {
            file.write(chunk);
            downloaded += chunk.length;

            let progress = (100.0 * downloaded / len).toFixed(2);
            let size = (len / 1e+6).toFixed(2), curr = (downloaded / 1e+6).toFixed(2);

            if(maxDownload !== -1 && downloaded > maxDownload) {
                statusCb('The file exceeds the max download size.');
                request.abort();
                clearTimeout(timer);
            }

            if(!size || isNaN(size)) {
                statusCb(`${curr}MB / ?? MB`);
            }
            else {
                statusCb(`${curr}MB / ${size}MB - ${progress}%`);
            }
            
            clearTimeout(timer);
            timer = setTimeout(() => {
                statusCb("The download timed out.");
                request.abort();
            }, 10000);
        }).on('end', ()  => {
            clearTimeout(timer);
            file.end();
            statusCb('Download finished!');
            onDone({
                mimetype: res.headers['content-type'],
                id,
                name: res.req.path.split("/")[res.req.path.split("/").length-1]
            });
        }).on('error', (err) => {
            statusCb(err.message);
            clearTimeout(timer);                
        });           
    });

    let stopper = () => {
        statusCb('The download was aborted.');
        request.abort();
        clearTimeout(timer);
    };

    return stopper;
};

module.exports = { dl };