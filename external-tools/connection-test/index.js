var http = require('http')
var url = require('url')
const querystring = require('querystring')
const WebSocket = require('ws');

http.createServer(function (request, response) {
    try{
        var requestUrl = url.parse(request.url)    
        const  {uri} = querystring.parse(requestUrl.query)
        if(uri){
            checkUrlForWSConnection(uri).then(statusCode => {
                console.log(uri, statusCode)
                response.writeHead(statusCode);
                response.end();
            }).catch((statusCode) => {
                console.log(uri, statusCode)
                response.writeHead(typeof statusCode === 'number' ? statusCode : 500);
                response.end();
            })
        }else {
            console.log('No "uri" in requestUrl for ', requestUrl.href)
        }
    }catch(e){
        console.error(e)
    }
}).listen(process.env.PORT || 80)  

function checkUrlForWSConnection(uri){
    return new Promise((resolve, reject) => {
        // Reject after x milliseconds
        const rejectTimeoutId = setTimeout( () => reject(408), 10000);
        try{
            // Try to make a connection and resolve if connection is made
            const ws = new WebSocket(uri)
            // const ws = new WebSocket('wss://echo.websocket.org/', {
            //   origin: 'https://websocket.org'
            // });
            ws.on('open', function open() {
                clearTimeout(rejectTimeoutId);
                resolve(200);
            });
            ws.on('error', () => {
                reject(500);
            })
        }catch(e){
            reject(500);
        }

    })


}