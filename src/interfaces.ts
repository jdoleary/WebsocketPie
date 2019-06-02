export type Action = 'ready' |  'skip';

// Client is a user connected via a socket
export interface Client {
  name: string;
}
export interface SocketData {
  action:Action;
  playerName:string;
}