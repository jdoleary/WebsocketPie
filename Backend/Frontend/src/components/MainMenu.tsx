import * as React from 'react';
import io from 'socket.io-client';
import Game from './Game';
import './MainMenu.scss';
import {GameState, SocketData, Client} from '../../../src/interfaces';

interface Props {

}
interface State {
    realName:string;
    customRoomNameMaker:string;
    connectedToSocket:boolean;
    room:string;
    game:GameState;
    clients:Client[];
}
export default class MainMenu extends React.Component<Props,State> {
    socket: SocketIOClient.Socket;
    admin = true; // TODO: make conditional
    constructor(props:Props){
        super(props);

        this.sendToServer = this.sendToServer.bind(this);
        this.sendToServerReady = this.sendToServerReady.bind(this);
        // Connect to socket.io
        this.socket = io();
        this.socket.on('connect', () => this.setState({connectedToSocket:true}));
        this.socket.on('data', (game:GameState) => {
            console.log('Got game state from server', game);
            // TODO: Needs typeguard
            this.setState({game});
        });
        this.socket.on('client-data', (clients:Client[]) => {
            console.log('Got clients from server', clients);
            this.setState({clients});

        })
;
        this.socket.on('disconnect', () => this.setState({connectedToSocket:false}));
        // Optionally get gameRoom name from query params:
        const urlParams = new URLSearchParams(window.location.search);
        const room = decodeURIComponent(urlParams.get('room') || '');
        const name = decodeURIComponent(urlParams.get('name') || '');
        this.state = {
            realName:name,
            customRoomNameMaker:'',
            room,
            game: null,
            clients:[],
            connectedToSocket:false
        }
        // Join game immediately if name and room are already provided by url query string params
        if(this.state.realName && this.state.room){
            this.joinRoom(this.state.room, this.state.realName);
        }
        if(this.admin){
            (window as any).sendToServer = this.sendToServer;
            (window as any).resetRoom = (roomToReset:string) => {
                console.log('reset room', roomToReset);
                if(roomToReset){
                    this.socket.emit('resetRoom',{roomToReset});
                }
            }
            (window as any).addFakePlayers = (numberOfFakePlayers: number) => {
                const numberOfCurrentClients = this.state.clients.length;
                for(let i = 0; i < numberOfFakePlayers; i++){
                    const client: Client = {name: 'fake_player_'+(numberOfCurrentClients + i), ready:true};
                    this.socket.emit('ADMIN-addClient',this.state.room, client);
                }
            }
            (window as any).makeAllPlayersReady = () => {
                this.state.clients.map(c => c.name).forEach(playerName => {
                    console.log(`[Admin] make ${playerName} ready`);
                    this.socket.emit('ready',{action:'ready',playerName});
                });
                
            }


        }
    }
    componentDidUpdate() {
        if(this.admin){
            (window as any).game = this.state.game; 
        }
    }
    sendToServerReady(json:SocketData) {
        if(this.socket){
            this.socket.emit('ready', json);
        }
        console.log('emitting', json);
    }
    sendToServer(json:SocketData) {
        if(this.socket){
            this.socket.emit('data', json);
        }
        console.log('emitting', json);
    }
    joinRoom(room:string, name:string){
        // Set url
        const newRoomName = encodeURIComponent(room);
        // Update query string:
        if (history.pushState) {
            var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + newRoomName +'&name='+ encodeURIComponent(name);
            window.history.pushState({path:newurl},'',newurl);
        }
        const client: Client = {name, ready:false};
        this.socket.emit('joinRoom',{room, client});
    }

    render() {
        const children = this.state.game ? 
                (<Game debug={false} sendToServer={this.sendToServer} sendToServerReady={this.sendToServerReady} realName={this.state.realName} room={this.state.room} game={this.state.game} clients={this.state.clients}/> 
                )
                : (
                    <div className="screen entry">
                        <label htmlFor="realName">Your Real Name:</label>
                        <input id="realName" data-cy="input-name" value={this.state.realName} onChange={evt=>this.setState({realName:evt.target.value})}/>
                        <label htmlFor="room">Game Room Name:</label>
                        <input id="room" data-cy="input-room" disabled={!!this.state.room} value={this.state.room || this.state.customRoomNameMaker} onChange={evt=>this.setState({customRoomNameMaker:evt.target.value})}/>
                        {this.state.room ? 
                            <button className="favorite styled"
                                    disabled={!this.state.realName}
                                    type="button"
                                    data-cy="btn-join-game"
                                    onClick={()=>{
                                        this.joinRoom(this.state.room, this.state.realName);
                                    }}>
                                Join Game
                            </button>
                            :
                            <button className="favorite styled"
                                    disabled={!this.state.realName || !this.state.customRoomNameMaker}
                                    type="button"
                                    data-cy="btn-join-game"
                                    onClick={()=>{
                                        const room = this.state.customRoomNameMaker;
                                        this.setState({room});
                                        this.joinRoom(room, this.state.realName);
                                    }}>
                                Join Game
                            </button>
                        }
                        {this.state.connectedToSocket ? <div className="server-status connected">connected to server</div> : <div className="server-status">server is down</div>}
                    </div>
                );
        return <div>
            {children}
        </div>;
    }
}
