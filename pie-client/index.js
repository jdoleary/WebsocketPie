/*
env: 'development' | 'production'
url: url of an echo server instance
onData: a callback that is send data emitted by the echo server
*/
const env = {
    development: 'development',
    production: 'production'
}
class client{
    constructor({env, url, onData}){
        this.env = env;
        this.url = url;
        this.onData = onData;
    }
    joinRoom(){
        // TODO
    }
    sendData(data){
        if(env === envs.development){
            const mockModifiedData = {
                ...data,
                type: 'data',
                fromClient: 'clientName', // TODO
                time: Date.now()

            }
            // Pretend server exists and echo data right back
            this.onData(mockModifiedData)

        }else if(env === envs.production){

        }
    }
}
module.exports = client;