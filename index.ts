import WebSocket from 'ws';
import {ChatMessage} from "./models/chat-message.model";
import {Message} from "./models/message.model";

enum MessageType {
    CONNECTION = 'connection',
    CHAT_MESSAGE = 'chat-message',
    TYPING_INDICATOR = 'typing-indicator'
}

let messages: Array<ChatMessage> = [];

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', ws => {
    onConnection();
    handleConnectionMessage(ws);
    ws.on('message', message => {
        onMessage(message);
        let receivedMessage: Message;
        if (typeof message === 'string') {
            receivedMessage = JSON.parse(message);

            if (!!receivedMessage.messageType && !!receivedMessage.payload) {
                switch (receivedMessage.messageType) {
                    case MessageType.CHAT_MESSAGE:
                        handleChatMessage(receivedMessage.payload, server);
                        break;
                    case MessageType.TYPING_INDICATOR:
                        break;
                    default:
                        throw new Error('Unsupported message');
                }
            }
        }
    });
    ws.on('error', error => {
        onError(error);
    });
    ws.on('close', ws => {
        if (!server.clients.size) {
            messages = [];
        }
        onClose(ws);
    })
});

function handleConnectionMessage(socket: WebSocket): void {
    socket.send(JSON.stringify({
        messageType: MessageType.CONNECTION,
        payload: messages
    }));
}

function handleChatMessage(message: ChatMessage, server: WebSocket.Server): void {
    if (!!message.from && !!message.text) {
        message.time = new Date().getTime();

        server.clients.forEach(client => {
            client.send(JSON.stringify({
                messageType: MessageType.CHAT_MESSAGE,
                payload: message
            }));
        });

        messages.push(message);
        messages.sort((a, b) => (a.time ?? 0) < (b.time ?? 0) ? -1 : 1);
    }
}

function onConnection(): void {
    console.log('Connected');
}

function onMessage(message: WebSocket.Data): void {
    console.log('Message:');
    console.log(message);
}

function onError(error: Error): void {
    console.log('Message:');
    console.log(error);
}

function onClose(ws: number): void {
    console.log('Closed:');
    console.log(ws);
}
