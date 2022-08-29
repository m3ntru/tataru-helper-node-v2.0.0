'use strict';

// json fixer
const { readFileSync, writeFileSync } = require('fs');

// communicate with main process
const { ipcRenderer } = require('electron');

// json fixer
const jsonFixer = require('json-fixer');

// audio module
const { addToPlaylist } = require('./audio-module');

// engine module
const { languageEnum } = require('./engine-module');

// zh convert
const zhConvert = require('../main_modules/translator/zh-convert');

// npc channel
const npcChannel = ['003D', '0044', '2AB9'];

// log location
const logLocation = process.env.USERPROFILE + '\\Documents\\Tataru Helper Node\\log';

// dialog timeout
let hideDialogTimeout = null;

// append blank dialog
function appendBlankDialog(id, code) {
    if (document.getElementById(id)) {
        const dialog = document.getElementById(id);
        dialog.innerHTML = '<span>......</span>';
        return;
    }

    const dialog = document.createElement('div');
    dialog.setAttribute('id', id);
    dialog.setAttribute('class', code);
    dialog.style.display = 'none';
    setStyle(dialog);
    document.getElementById('div_dialog').append(dialog);

    if (document.querySelectorAll('#div_dialog div').length > 0) {
        document.getElementById(document.getElementById('div_dialog').firstElementChild.id).style.marginTop = '0';
    }
}

// update dialog
function updateDialog(id, name, text, dialogData = null, translation = null) {
    // zh convert
    if (translation) {
        console.log(dialogData);
        console.log(translation);
        name = zhtConvert(name, translation.to);
        text = zhtConvert(text, translation.to);
        if (global.tmiStatus && dialogData.name) 
            global.tmiHandler.send(dialogData.name +": "+ text);
    }

    // set dialog
    const dialog = document.getElementById(id);

    dialog.style.cursor = 'pointer';
    dialog.style.display = 'block';
    dialog.onclick = () => {
        const config = ipcRenderer.sendSync('get-config');

        if (config.indexWindow.advance) {
            ipcRenderer.send('create-window', 'edit', id);
        }
    };

    dialog.innerHTML = `<span class="drop_shadow">${name !== '' ? name + ':<br>' : ''}${text}</span>`;

    // show dialog
    showDialog();

    if (dialogData && translation) {
        // save dialog
        saveLog(id, name, text, dialogData, translation);
    }

    // move to dialog
    location.href = '#' + id;
}

// append notification
function appendNotification(text) {
    const config = ipcRenderer.sendSync('get-config');
    const timestamp = new Date().getTime();
    const id = 'id' + timestamp;
    const code = 'FFFF';

    // zh convert
    text = zhtConvert(text, config.translation.to);

    appendBlankDialog(id, code);
    updateDialog(id, '', text, { id: id, code: code, playerName: '', name: '', text: '', timestamp: timestamp }, {});

    // set timeout
    setTimeout(() => {
        try {
            document.getElementById(id).remove();
        } catch (error) {
            console.log(error);
        }
    }, Math.min(Math.round(text.length / 10) * 2500, 10000));
}

// show dialog
function showDialog() {
    clearTimeout(hideDialogTimeout);
    hideDialogTimeout = null;

    const config = ipcRenderer.sendSync('get-config');
    const dialog = document.getElementById('div_dialog');
    dialog.hidden = false;

    if (config.indexWindow.hideDialog) {
        hideDialogTimeout = setTimeout(() => {
            dialog.hidden = true;
        }, config.indexWindow.hideDialogTimeout * 1000);
    }
}

// set style
function setStyle(dialog) {
    const config = ipcRenderer.sendSync('get-config');

    dialog.style.fontWeight = config.dialog.weight;
    dialog.style.color = config.channel[dialog.className]
        ? config.channel[dialog.className]
        : getColor(dialog.className);
    dialog.style.fontSize = config.dialog.fontSize + 'rem';
    dialog.style.marginTop = config.dialog.spacing + 'rem';
    dialog.style.borderRadius = config.dialog.radius + 'rem';
    dialog.style.backgroundColor = config.dialog.backgroundColor;
}

// get color
function getColor(code) {
    const chatCode = ipcRenderer.sendSync('get-chat-code');
    let color = '#FFFFFF';

    for (let index = 0; index < chatCode.length; index++) {
        const element = chatCode[index];

        if (code === element.ChatCode) {
            color = element.Color;
            break;
        }
    }

    return color;
}

// zh convert
function zhtConvert(text, languageTo) {
    if (languageTo === languageEnum.zht) {
        return zhConvert.exec({ text: text, tableName: 'zh2Hant' });
    } else if (languageTo === languageEnum.zhs) {
        return zhConvert.exec({ text: text, tableName: 'zh2Hans' });
    } else {
        return text;
    }
}

// save dialog
function saveLog(id, name, text, dialogData, translation) {
    const item = {
        id: id,
        code: dialogData.code,
        player: dialogData.playerName,
        name: dialogData.name,
        text: dialogData.text,
        audio_text: dialogData.audioText,
        translated_name: name,
        translated_text: text,
        timestamp: dialogData.timestamp,
        datetime: new Date(dialogData.timestamp).toLocaleString(),
        translation: translation,
    };

    const fileLocation = logLocation + '\\' + createLogName(item.timestamp);
    let log = null;

    // read/create log file
    try {
        log = jsonFixer(readFileSync(fileLocation).toString()).data;
    } catch (error) {
        console.log(error);
        log = {};
    }

    // play audio at first time
    if (!log[item.id]) {
        if (npcChannel.includes(dialogData.code)) {
            addToPlaylist(dialogData.audioText, translation);
        }
    }

    // add/replcae log
    log[item.id] = item;

    // write log file
    try {
        writeFileSync(fileLocation, JSON.stringify(log, null, '\t'));
    } catch (error) {
        console.error(error);
    }
}

// create log name
function createLogName(milliseconds = null) {
    const date = Number.isInteger(milliseconds) ? new Date(milliseconds) : new Date();
    let dateString = date.toLocaleDateString().split('/');

    if (dateString[1].length < 2) {
        dateString[1] = '0' + dateString[1];
    }

    if (dateString[2].length < 2) {
        dateString[2] = '0' + dateString[2];
    }

    return dateString.join('-') + '.json';
}

// move to bottom
function moveToBottom() {
    clearSelection();

    let div = document.getElementById('div_dialog') || document.scrollingElement || document.body;
    div.scrollTop = div.scrollHeight;
}

// clear selection
function clearSelection() {
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    } else if (document.selection) {
        document.selection.empty();
    }
}

exports.appendBlankDialog = appendBlankDialog;
exports.updateDialog = updateDialog;
exports.appendNotification = appendNotification;
exports.setStyle = setStyle;
exports.createLogName = createLogName;
exports.showDialog = showDialog;
exports.moveToBottom = moveToBottom;
