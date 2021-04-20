# connection-test

Connection-test runs a super simple http server that checks if the `uri` in the queryparameter is running a Websocket Server.

## Usage

Run the server with `npm start`.
Then, assumming the server is running at localhost:80, go to `http://localhost:80/?uri=ws://localhost:8000`. It will return statusCode 200 if ws://localhost:8000 is running a websocket server.

## Docker

Build
`docker build . -t jdoleary1991/websocket-server-liveness-tester:1.0.0`
Run
`docker run -p 49160:8080 -d jdoleary1991/websocket-server-liveness-tester:1.0.0`
