'use strict';

// communicate with main process
const { ipcRenderer } = require('electron');

// http
const http = require('http');

// cprrection module
const { correctionEntry } = require('./correction-module');

// text history
let textHistory = {};

// create server
const server = http.createServer(function(request, response) {
    if (request.method === 'POST') {
        request.on('data', function(data) {
            dataProcess(data);
        });

        request.on('end', function() {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end('POST completed');
        });
    } else if (request.method === 'GET') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('GET is not supported');
    }
});

server.on('listening', () => {
    console.log('Opened server on', server.address());
});

server.on('error', (err) => {
    ipcRenderer.send('send-preload', 'show-notification', err.message);
    server.close();
});

// start server
function startServer() {
    const config = ipcRenderer.sendSync('load-config');
    const host = config.server.host;
    const port = config.server.port;

    server.close();
    server.listen(port, host);
}

// data process
function dataProcess(data) {
    try {
        const config = ipcRenderer.sendSync('load-config');
        let dialogData = JSON.parse(data.toString());

        if (dataCheck(dialogData)) {
            // check code
            if (dialogData.text !== '' && config.channel[dialogData.code]) {
                // check text history
                if (textHistory[dialogData.text] && new Date().getTime() - textHistory[dialogData.text] < 5000) {
                    return;
                } else {
                    textHistory[dialogData.text] = new Date().getTime();
                }

                // check id
                if (!dialogData.id) {
                    const timestamp = new Date().getTime();
                    dialogData.id = 'id' + timestamp;
                    dialogData.timestamp = timestamp;
                }

                // system message process
                if (isSystemMessage(dialogData)) {
                    if (dialogData.name !== '' && dialogData.name !== '...') {
                        dialogData.text = dialogData.name + ': ' + dialogData.text;
                        dialogData.name = '';
                    }
                }

                // string correction
                correctionEntry(dialogData, config.translation);


                console.warn('data:', dialogData);
            } else {
                console.log('data:' + dialogData);
                console.log('Chat code is not in list.');
            }
        }
    } catch (error) {
        console.error(error);
    }
}

// dialog data check
function dataCheck(dialogData) {
    const names = Object.getOwnPropertyNames(dialogData);

    return names.includes('code') &&
        names.includes('playerName') &&
        names.includes('name') &&
        names.includes('text');
}

// channel check
function isSystemMessage(dialogData) {
    const systemChannel = [
        '0039',
        '0839',
        '0003',
        '0038',
        '003C',
        '0048',
        '001D',
        '001C',
    ];

    return systemChannel.includes(dialogData.code);
}

exports.startServer = startServer;