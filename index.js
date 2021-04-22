const sfCommandId = 'cknsud2tu000aso10mth31dlg';


const fs = require('fs');
const WebSocket = require('ws');
const fetch = require('node-fetch');
const io = require('socket.io-client');

const osc = require('node-osc');
var oscServer = null;

function debounce(func, wait, immediate) {
    var timeout = void 0;

    return function doDebounce() {
        var context = this;
        var args = arguments;

        var later = function later() {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        };

        var callNow = immediate && !timeout;

        clearTimeout(timeout);

        timeout = setTimeout(later, wait);

        if (callNow) {
            func.apply(context, args);
        }
    };
}

function changeInstrument(webAddress) {
    wsock = io.connect('ws://'+webAddress +'/',{'reconnection limit':3000,'max reconnection attempts':Infinity});
    if (oscServer == null)
    {
        oscServer = new osc.Server(9005, '0.0.0.0');

        oscServer.on("message", function (msg, rinfo)
        {
            console.log(rinfo)
            if (msg[0] == "/changeInstrument")
            {
                console.log("sending change instrument…");
                console.log("is connected: " +  wsock.socket.connected);
                try {
                    wsock.send('WCLE');
                } catch (e) { console.log("error: " + e);}
                
            }

        });
    }
    return true;
}

function viennaConnection({ packageId }) {
    var ws,
        handlers = {},
        matrixInfo = {},
        matrixRow = { idx: '', title: '' },
        matrixSize = { w: 0, h: 0 };

    init();
    //testSFConnection().catch(handleError);

    async function testSFConnection() {
        var data = {};
        for (var i = 0; i < 10000; i++) {
            data[i] = 'hejsa med digsa';
        }
        await sendToSoundFlow({ data });
    }

    function init() {
        handlers.updateCellNames = updateCellNames;
        handlers.resizeMatrix = resizeMatrix;
        handlers.setMatrixTitle = setMatrixTitle;
        handlers.selectCellXY = selectCellXY;

        console.log('Package Id: ' + packageId);

        console.log('Listening for Vienna Instruments Pro instances...');
        connect();
    }

    function connect() {
        ws = new WebSocket('ws://'+webAddress +'/');

        ws.on('open', onInit);

        ws.on('message', function(message) {
            //console.log('received: %s', message);
            receiveMessage(message);
        });

        ws.on('error', function(err) {
            if ((err + '').indexOf('ECONNREFUSED') < 0) {
                //Only show error if it wasn't a simple ECONNREFUSED
                console.log('Der skete en fejl i websocket: ' + err, err);
            }
            setTimeout(() => retry(), 1000);
            return true;
        });
    }

    function retry() {
        connect();
    }

    function onInit() {
        console.log('Opened... Calling init');
        ws.send('INIT');
    }

    function handleError(err) {
        console.log('ERROR: ' + err, err);
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

                var handler = handlers[msg];
                if (handler) {
                    //console.log(msg, args);
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
        matrixSize = { w, h };
        updateSoundFlow();
    }

    function setMatrixTitle([idx,title]){
        matrixRow = { idx, title };
        updateSoundFlow();
    }

    function updateCellNames([texts, changedRecords]) {
        //console.log('New cell names: ', { texts, changedRecords });
        for (let record of changedRecords) {
            const [x, y, textIndex, flags] = record;
            const isBlank = flags === 8;
            const cellText = texts[textIndex];

            matrixInfo[x + ',' + y] = cellText || '';
        }
        updateSoundFlow();
    }

    function selectCellXY([x, y]) {
        reportSelectAsync(x, y).catch(handleError);
    }

    async function reportSelectAsync(x, y) {
        await sendToSoundFlow({
            selectedCell: { x, y },
        });
    }

    const updateSoundFlow = debounce(
        () => updateSoundFlowAsync().catch(handleError),
        50,
    );

    function getMatrixRepresentation() {
        let newMatrixInfo = {};
        let { w, h } = matrixSize;
        for (let x = 0; x < w; x++)
            for (let y = 0; y < h; y++) {
                let key = x + ',' + y;
                newMatrixInfo[key] = matrixInfo[key] || '';
            }
           // console.log(newMatrixInfo)
        return newMatrixInfo;
    }

    async function updateSoundFlowAsync() {
        await sendToSoundFlow({
            buttonNames: getMatrixRepresentation(),
            matrixSize: matrixSize,
            matrixRow: matrixRow,
        });
    }

    async function sendToSoundFlow(data) {
        console.log(data);
        const fetchRes = await fetch(
            'http://localhost:1780/command/' + packageId + ':' + sfCommandId,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            },
        );
        const response = await fetchRes.json();
        console.log('Response from SF: ', response);
    }
}

var webAddress = fs.readFileSync(__dirname + '/webAddress.txt', 'utf8').toString().trim();

(function() {
    var packageId = fs.readFileSync(__dirname + '/packageId.txt', 'utf8').toString().trim();
    viennaConnection({ packageId });
})();

changeInstrument(webAddress)
