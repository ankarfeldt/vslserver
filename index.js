const sfCommandWebTrigger =
    'http://localhost:1780/command/user:cjol1m8090000fx10cirjhcel:cjonk6xpp0000z010q1ijb59b';

const WebSocket = require('ws');
const fetch = require('node-fetch');

function viennaConnection() {
    var ws,
        handlers = {},
        matrixInfo = {},
        matrixSize = { w: 0, h: 0 };

    init();

    function init() {
        handlers.updateCellNames = updateCellNames;
        handlers.resizeMatrix = resizeMatrix;

        connect();
    }

    function connect() {
        ws = new WebSocket('ws://127.0.0.1:8080/');

        ws.on('open', onInit);

        ws.on('message', function(message) {
            //console.log('received: %s', message);
            receiveMessage(message);
        });

        ws.on('error', function(err) {
            console.log('Der skete en fejl i websocket: ' + err, err);
            return true;
        });
    }

    function onInit() {
        console.log('Opened... Calling init');
        ws.send('INIT');
    }

    function receiveMessage(data) {
        var s = data;
        var i = s.indexOf(':::');
        if (i >= 0) s = s.substring(i + 3);
        i = s.indexOf('::');
        if (i >= 0) s = s.substring(i + 2);

        try {
            for (let line of s.split('\n')) {
                if (!line.trim()) continue;
                var [msg, argsF] = line.split('(');
                var args = JSON.parse('[' + argsF.slice(0, -2) + ']');
                //console.log(msg, args);

                var handler = handlers[msg];
                if (handler) {
                    handler(args);
                } else {
                    //console.log('Unsupported handler for msg: ' + msg);
                }
            }
        } catch (e) {
            console.log('ERROR: ' + e);
        }
    }

    function resizeMatrix([w, h]) {
        let newMatrixInfo = {};
        for (let x = 0; x < w; x++)
            for (let y = 0; y < h; y++) {
                let key = x + ',' + y;
                newMatrixInfo[key] = matrixInfo[key];
            }
        matrixInfo = newMatrixInfo;
        matrixSize = { w, h };
        updateSoundFlow();
    }

    function updateCellNames([texts, changedRecords]) {
        //console.log('New cell names: ', { texts, changedRecords });
        for (let record of changedRecords) {
            const [x, y, textIndex, flags] = record;
            const isBlank = flags === 8;
            const cellText = texts[textIndex];

            matrixInfo[x + ',' + y] = cellText;
        }
        updateSoundFlow();
    }

    async function updateSoundFlow() {
        const data = {
            buttonNames: matrixInfo,
            matrixSize: matrixSize,
        };
        console.log(data);
        const fetchRes = await fetch(sfCommandWebTrigger, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        const response = await fetchRes.json();
        console.log('Response from SF: ', response);
    }
}

viennaConnection();
