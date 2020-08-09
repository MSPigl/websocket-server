import WebSocket from 'ws';

let messages: Array<{ from: string, text: string, time?: number }> = [];

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', ws => {
    onConnection(ws);
    ws.send(JSON.stringify({
        data: messages,
        messageType: 'connection'
    }));
    ws.on('message', message => {
        onMessage(message);
        let receivedMessage: { text: string, from: string, time?: number };
        if (typeof message === "string") {
            receivedMessage = JSON.parse(message);
            if (!!receivedMessage['text'] && !!receivedMessage['from']) {
                receivedMessage.time = new Date().getTime();
                messages.push(receivedMessage);

                server.clients.forEach(client => {
                    client.send(JSON.stringify({
                        data: receivedMessage,
                        messageType: 'message'
                    }));
                });
                messages.sort((a, b) => (a.time ?? 0) < (b.time ?? 0) ? -1 : 1);
            } else {
                throw new Error('Bad Request');
            }
        } else {
            throw new Error('Bad Request');
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

function onConnection(ws: WebSocket): void {
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
