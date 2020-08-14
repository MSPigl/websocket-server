import WebSocket from 'ws';
import {ChatMessage} from "./models/chat-message.model";
import {Message} from "./models/message.model";
import {User} from "./models/user.model";
import {Chat} from "./models/chat.model";

enum MessageType {
    CONNECTION = 'connection',
    USER_CONNECTED = 'user-connected',
    USER_DISCONNECTED = 'user-disconnected',
    CHAT_CREATED = 'chat-created',
    USER_JOINED_CHAT = 'user-joined-chat',
    USER_LEFT_CHAT = 'user-left-chat',
    CHAT_MESSAGE = 'chat-message',
    USER_TYPING_START = 'user-typing-start',
    USER_TYPING_END = 'user-typing-end'
}

let chats: Array<Chat> = [];

let messages: Array<ChatMessage> = [];

let users: Array<User> = [];

const clients: { [id: number]: { name: string | null, client: WebSocket } } = { };

let baseUserId = 1;
let baseChatId = 1;

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', ws => {
    onConnection();
    handleConnectionMessage(ws);

    const webSocketId = baseUserId++;
    clients[webSocketId] = { name: null, client: ws };

    ws.on('message', (message) => {
        onMessage(message);
        let receivedMessage: Message;
        if (typeof message === 'string') {
            receivedMessage = JSON.parse(message);
            console.log('Message received from %s', clients[webSocketId].name ?? 'Unknown');

            if (!!receivedMessage.messageType && !!receivedMessage.payload) {
                switch (receivedMessage.messageType) {
                    case MessageType.CHAT_MESSAGE:
                        handleChatMessage(receivedMessage.payload);
                        break;
                    case MessageType.USER_CONNECTED:
                        const client = clients[webSocketId];
                        if (!!client) {
                            client.name = receivedMessage.payload;
                        }
                        handleUserConnection(receivedMessage.payload)
                        break;
                    case MessageType.USER_DISCONNECTED:
                        handleUserDisconnection(receivedMessage.payload);
                        break;
                    case MessageType.CHAT_CREATED:
                        handleChatCreated(receivedMessage.payload);
                        break;
                    case MessageType.USER_JOINED_CHAT:
                        handleUserJoinedChat(receivedMessage.payload);
                        break;
                    case MessageType.USER_LEFT_CHAT:
                        handleUserLeftChat(receivedMessage.payload);
                        break;
                    case MessageType.USER_TYPING_START:
                        handleUserTypingEvent(receivedMessage.payload);
                        break;
                    case MessageType.USER_TYPING_END:
                        handleUserTypingEvent(receivedMessage.payload);
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

function sendMessageToClient(clientId: number, message: Message): void {
    const client = clients[clientId];

    if (!!client) {
        client.client.send(JSON.stringify(message));
    }
}

function sendMessageToClientsInChat(chat: Chat, message: Message): void {
    const clientsInChat: Array<number> = [];
    const usersInChat = chat.users.map(user => user.name);
    for (const clientId of Object.keys(clients)) {
        if (usersInChat.includes((clients[+clientId].name ?? ''))) {
            clientsInChat.push(+clientId);
        }
    }

    if (!!clientsInChat.length) {
        for (const clientId of clientsInChat) {
            sendMessageToClient(clientId, message);
        }
    }
}

function handleConnectionMessage(socket: WebSocket): void {
    socket.send(JSON.stringify({
        messageType: MessageType.CONNECTION,
        payload: messages
    }));
}

function handleUserConnection(name: string): void {
    console.log('%s has joined the server', name);
    users.push({ name: name, typing: false });
    sendMessageToAllClients({ messageType: MessageType.USER_CONNECTED, payload: users });
}

function handleUserDisconnection(name: string): void {
    console.log('%s has left the server', name);

    const foundIndex = users.findIndex(user => user.name === name);

    if (foundIndex >= 0) {
        users.splice(foundIndex, 1);
    }

    sendMessageToAllClients({ messageType: MessageType.USER_CONNECTED, payload: users });
}

function handleChatCreated(name: string): void {
    chats.push({
        chatId: baseChatId++,
        messages: [],
        users: [
            { name: name, typing: false }
        ]
    });

    sendMessageToAllClients({ messageType: MessageType.CHAT_CREATED, payload: chats });
}

function handleUserJoinedChat(joinEvent: { name: string, chatId: number }): void {
    const foundChat = chats.find(chat => chat.chatId === joinEvent.chatId);

    if (!!foundChat) {
        foundChat.users.push({ name: name, typing: false });
        sendMessageToAllClients({ messageType: MessageType.USER_JOINED_CHAT, payload: chats });
    }
}

function handleUserLeftChat(leaveEvent: { name: string, chatId: number }): void {
    const foundChat = chats.find(chat => chat.chatId === leaveEvent.chatId);

    if (!!foundChat) {
        const foundUserIndex = foundChat.users.findIndex(user => user.name === name);

        if (foundUserIndex >= 0) {
            sendMessageToAllClients({ messageType: MessageType.USER_LEFT_CHAT, payload: chats });
        }
    }
}

function handleUserTypingEvent(typingEvent: { name: string, chatId: number, typing: boolean }): void {
    console.log('%s has %s typing', typingEvent.name, typingEvent.typing ? 'started' : 'stopped');

    const foundChat = chats.find(chat => chat.chatId === typingEvent.chatId);

    if (!!foundChat) {
        const foundUserIndex = users.findIndex(user => user.name === typingEvent.name);

        if (foundUserIndex >= 0) {
            users[foundUserIndex].typing = typingEvent.typing;
            sendMessageToClientsInChat(foundChat, {
                messageType: typingEvent.typing ? MessageType.USER_TYPING_START : MessageType.USER_TYPING_END,
                payload: foundChat.users
            });
        }
    }
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
