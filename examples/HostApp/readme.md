# Example HostApp

WebsocketPie is designed to be client-agnostic - meaning it doesn't care what the application does, it will just broker messages between all the clients so that they can communicate.

This is useful in that one instance of a @websocketpie/server can support any number of different applications.  However, the drawback to this is that WebsocketPie doesn't store any state!  For applications that need a canonical source of truth for state, simply use `makeHostAppInstance`!  This function is passed into network.js's startServer and is expected to return an instance that has a handleMessage function (which will receive all of a room's messages just like the clients do), and the instance will be given a `sendData` property which it can use to communicate with the clients.

Each room has a unique hostAppInstance (if makeHostAppInstance is provided).