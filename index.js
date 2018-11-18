var WebSocket = require('ws');

ws = new WebSocket('ws://127.0.0.1:8080/ws');

ws.on('open', function() {
    ws.send('INIT');
});

var refreshInterval = setInterval(function() {
    try {
        ws.send('INIT');
    } catch (err) {
        process.stdout.write('Refresh (INIT) error\n');
        clearInterval(refreshInterval);
    }
}, 1000);

ws.on('message', function(message) {
    console.log('received: %s', message);
    //receiveMessage(message);
});

ws.on('error', function(err) {
    process.stdout.write('Der skete en fejl i websocket\n');
    return true;
});
