import * as React from 'react';
import './Game.scss';
import { GameState, Player, SocketData, Client } from '../../../src/interfaces';


interface Props {
    debug: boolean; // Show dev debug info
    sendToServer: (json:SocketData)=>void;
    sendToServerReady: (json:SocketData)=>void;
    realName: string;
    room: string;
    game: GameState;
    clients:Client[];

}
interface State {

}
export default class Main extends React.Component<Props, State> {
    constructor(props:Props){
        super(props);
        this.state = {
        }
    }
    meClient() {
        const {clients} = this.props;
        return clients.find(c => c.name === this.props.realName);   
    }
    me() {
        const {players} = this.props.game;
        return players.find(p => p.name === this.props.realName);
    }

    renderClients(clients:Client[]){
        const meClient = this.meClient();
        if(!meClient){return;}
        return [this.renderClient(meClient), ...clients.filter(c => c.name !== meClient.name).map(this.renderClient.bind(this))];
    }

    renderStage() {
        const {players} = this.props.game;
        const {clients} = this.props;

        return (<div>
            <div>
                <div style={{"pointerEvents":"none"}}>
                    {this.renderClients(clients)}
                </div>
                <div className="btn btn-ready"  data-cy="btn-ready" onClick={()=>{
                    this.props.sendToServerReady({action:'ready',playerName:this.props.realName});
                }}>Ready</div>
            </div>
            </div>)

    }

    renderClient(client:Client){
        return (
            <div className={'player-row disabled'} key={client.name} data-cy="player-row">
                <div className={'use-character-image icon unknown'}></div>
                <div className="name">{client.name}</div>
            </div>
        );
    }
    componentDidMount(){
        if(this.props.game.inProgress){
            // Start off showing the character card:
            this.setState({page:'characterCard',characterCardFocus:this.props.realName});
        }
    }
    componentDidUpdate(prevProps:Props){
        if(!prevProps.game.inProgress && this.props.game.inProgress){
            // Start off showing the character card:
            this.setState({page:'characterCard',characterCardFocus:this.props.realName});
        }
    }
    render() {
        const me = this.me();
        
        return (<div className={`screen`}>
            {this.renderStage()}
            <div style={{position:'absolute',bottom:0}}>Versions: b.{this.props.game.BE_version}</div>
        </div>);
    }
}