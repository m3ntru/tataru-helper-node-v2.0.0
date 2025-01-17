'use strict';

// fs
const { unlinkSync } = require('fs');

// path
const { resolve } = require('path');

// communicate with main process
const { ipcRenderer } = require('electron');

// drag module
const { setDragElement } = require('./renderer_modules/drag-module');

// DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    setView();
    setIPC();
    setButton();
});

// set view
function setView() {
    document.getElementById('img_result').setAttribute('src', getPath('result.png'));
}

// set IPC
function setIPC() {
    ipcRenderer.on('send-data', (event, stringArray) => {
        let text = '';

        for (let index = 0; index < stringArray.length; index++) {
            text += stringArray[index] + '\n';
        }

        document.getElementById('textarea_screen_text').value = text;
    });
}

// set button
function setButton() {
    // drag
    setDragElement(document.getElementById('img_button_drag'));

    // submit
    document.getElementById('button_submit').onclick = () => {
        translate(document.getElementById('textarea_screen_text').value);
    };

    // close
    document.getElementById('img_button_close').onclick = () => {
        ipcRenderer.send('close-window');
    };
}

function translate(text) {
    const config = ipcRenderer.sendSync('get-config');

    // set string array
    let stringArray = [];
    if (config.captureWindow.split) {
        stringArray = text.split('\n');
    } else {
        stringArray = [text.replaceAll('\n', '')];
    }

    // delete images
    deleteImages();

    // start translate
    const timestamp = new Date().getTime();
    for (let index = 0; index < stringArray.length; index++) {
        const element = stringArray[index];
        if (element !== '') {
            const dialogData = {
                id: 'id' + (timestamp + index),
                code: '003D',
                playerName: '',
                name: '',
                text: element,
                timestamp: timestamp + index,
            };

            ipcRenderer.send('start-translation', dialogData, config.translation);
        }
    }
}

// get path
function getPath(file) {
    return resolve(process.cwd(), 'trained_data', file);
}

// delete images
function deleteImages() {
    const images = ['screenshot.png', 'crop.png', 'result.png'];

    images.forEach((value) => {
        try {
            unlinkSync(getPath(value));
        } catch (error) {
            console.log(error);
        }
    });
}
