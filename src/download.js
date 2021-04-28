const http = require('http');
const fs = require('fs');

const dl = async (url, id, statusCb, onDone) => {
    let request;
    let file = fs.createWriteStream("./uploads/" + id);

    let timer = setTimeout(() => {
        request.abort();
        statusCb("The download timed out.");
    }, 10000);

    request = http.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246',
        }
    }).on('response', function(res) {
        let len = parseInt(res.headers['content-length']);
        let downloaded = 0;
            
        res.on('data', function(chunk) {
            file.write(chunk);
            downloaded += chunk.length;
            statusCb("Downloading " + (100.0 * downloaded / len).toFixed(2) + "%");
            clearTimeout(timer);
            timer = setTimeout(() => {
                request.abort();
                statusCb("The download timed out.");
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
            clearTimeout(timer);                
            statusCb(err.message);
        });           
    });
};

module.exports = { dl };