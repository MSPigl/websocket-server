import WebSocket from 'ws';
import {ChatMessage} from "./models/chat-message.model";
import {Message} from "./models/message.model";

enum MessageType {
    CONNECTION = 'connection',
    USER_CONNECTED = 'user-connected',
    USER_DISCONNECTED = 'user-disconnected',
    CHAT_MESSAGE = 'chat-message',
    USER_TYPING_START = 'user-typing-start',
    USER_TYPING_END = 'user-typing-end'
}

let messages: Array<ChatMessage> = [];

let users: Array<{ name: string, typing: boolean }> = [];

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
                        handleChatMessage(receivedMessage.payload);
                        break;
                    case MessageType.USER_CONNECTED:
                        handleUserConnection(receivedMessage.payload)
                        break;
                    case MessageType.USER_DISCONNECTED:
                        handleUserDisconnection(receivedMessage.payload);
                        break;
                    case MessageType.USER_TYPING_START:
                        handleUserTypingStart(receivedMessage.payload);
                        break;
                    case MessageType.USER_TYPING_END:
                        handleUserTypingEnd(receivedMessage.payload);
                        break;
                    default:
                        throw new Error('Unsupported message type');
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
            users = [];
        }
        onClose(ws);
    })
});

function sendMessageToAllClients(message: Message): void {
    server.clients.forEach(client => client.send(JSON.stringify(message)));
}

function handleConnectionMessage(socket: WebSocket): void {
    socket.send(JSON.stringify({
        messageType: MessageType.CONNECTION,
        payload: messages
    }));
}

function handleUserConnection(name: string): void {
    console.log('%s has joined the chat', name);
    users.push({ name: name, typing: false });
    sendMessageToAllClients({ messageType: MessageType.USER_CONNECTED, payload: users });
}

function handleUserDisconnection(name: string): void {
    console.log('%s has left the chat', name);

    const foundIndex = users.findIndex(user => user.name === name);

    if (foundIndex >= 0) {
        users.splice(foundIndex, 1);
    }

    sendMessageToAllClients({ messageType: MessageType.USER_CONNECTED, payload: users });
}

function handleUserTypingStart(name: string): void {
    console.log('%s has started typing', name);

    const foundIndex = users.findIndex(user => user.name === name);

    if (foundIndex >= 0) {
        users[foundIndex].typing = true;
    }

    sendMessageToAllClients({ messageType: MessageType.USER_TYPING_START, payload: users });
}

function handleUserTypingEnd(name: string): void {
    console.log('%s has stopped typing', name);

    const foundIndex = users.findIndex(user => user.name === name);

    if (foundIndex >= 0) {
        users[foundIndex].typing = false;
    }

    sendMessageToAllClients({ messageType: MessageType.USER_TYPING_END, payload: users });
}

function handleChatMessage(message: ChatMessage): void {
    if (!!message.from && !!message.text) {
        message.time = new Date().getTime();

        sendMessageToAllClients({ messageType: MessageType.CHAT_MESSAGE, payload: message });

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
