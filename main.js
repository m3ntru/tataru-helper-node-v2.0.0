'use strict';

// fs
const { existsSync, mkdirSync } = require('fs');

// path
const path = require('path');

// electron modules
const { app, ipcMain, screen, BrowserWindow, globalShortcut } = require('electron');

// config module
const { loadConfig, saveConfig, getDefaultConfig } = require('./module/config-module');

// chat code module
const { loadChatCode, saveChatCode, getDefaultChatCode } = require('./module/chat-code-module');

// config
let config = null;
let chatCode = null;

// window list
let windowList = {
    'index': null,
    'config': null,
    'capture': null,
    'capture-edit': null,
    'edit': null,
    'read-log': null
}

app.whenReady().then(() => {
    // check directory
    checkDirectory();

    // load config
    config = loadConfig();

    // load chat code
    chatCode = loadChatCode();

    // create index window
    createWindow('index');

    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) createWindow('index');
    });
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit();
});

// ipc
// get app version
ipcMain.on('get-version', (event) => {
    event.returnValue = app.getVersion();
});

// close app
ipcMain.on('close-app', () => {
    app.quit();
});

// get config
ipcMain.on('get-config', (event) => {
    if (!config) {
        config = loadConfig();
    }

    event.returnValue = config;
});

// set config
ipcMain.on('set-config', (event, newConfig) => {
    config = newConfig;
});

// set default config
ipcMain.on('set-default-config', () => {
    config = getDefaultConfig();
});

// get chat code
ipcMain.on('get-chat-code', (event) => {
    if (!chatCode) {
        chatCode = loadChatCode();
    }

    event.returnValue = chatCode;
});

// set chat code
ipcMain.on('set-chat-code', (event, newChatCode) => {
    chatCode = newChatCode;
});

// set default chat code
ipcMain.on('set-default-chat-code', () => {
    chatCode = getDefaultChatCode();
});

// set key down
ipcMain.on('set-key-down', () => {
    setKeyDown();
});

// create sindow
ipcMain.on('create-window', (event, type, data = null) => {
    try {
        // force close
        windowList[type].close();
        windowList[type] = null;
    } catch (error) {
        // do nothing
    }

    // create window
    createWindow(type, data);
});

// drag window
ipcMain.on('drag-window', (event, clientX, clientY, windowWidth, windowHeight) => {
    try {
        const cursorScreenPoint = screen.getCursorScreenPoint();
        BrowserWindow.fromWebContents(event.sender).setBounds({
            x: cursorScreenPoint.x - clientX,
            y: cursorScreenPoint.y - clientY,
            width: windowWidth,
            height: windowHeight
        });
    } catch (error) {
        console.log(error);
    }
});

// mute window
ipcMain.on('mute-window', (event, isMuted) => {
    BrowserWindow.fromWebContents(event.sender).webContents.setAudioMuted(isMuted);
});

// minimize window
ipcMain.on('minimize-window', (event) => {
    try {
        BrowserWindow.fromWebContents(event.sender).minimize();
    } catch (error) {
        console.log(error);
    }
});

// close window
ipcMain.on('close-window', (event) => {
    try {
        BrowserWindow.fromWebContents(event.sender).close();
    } catch (error) {
        console.log(error);
    }
});

// send index
ipcMain.on('send-index', (event, channel, ...args) => {
    sendIndex(channel, ...args);
});

// always on top
ipcMain.on('set-always-on-top', (event, top) => {
    try {
        windowList['index'].setAlwaysOnTop(top, 'screen-saver');
    } catch (error) {
        console.log(error);
    }
});

// set click through
ipcMain.on('set-click-through', (event, ignore) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window.setIgnoreMouseEvents(ignore, { forward: true });
    window.setResizable(!ignore);
});

// mouse check
ipcMain.on('mouse-out-check', (event, windowX, windowY, windowWidth, windowHeight) => {
    const cursorScreenPoint = screen.getCursorScreenPoint();

    event.returnValue = (cursorScreenPoint.x < windowX ||
        cursorScreenPoint.x > windowX + windowWidth ||
        cursorScreenPoint.y < windowY ||
        cursorScreenPoint.y > windowY + windowHeight
    );
});

// start screen translation
ipcMain.on('start-screen-translation', (event, rectangleSize) => {
    // get display matching the rectangle
    const display = screen.getDisplayMatching(rectangleSize);

    // get display's index
    const displays = screen.getAllDisplays();
    let displayIndex = 0;

    for (let index = 0; index < displays.length; index++) {
        if (displays[index].id === display.id) {
            displayIndex = index;
            break;
        }
    }

    // fix x
    if (rectangleSize.x < 0 || rectangleSize.x >= display.bounds.width) {
        rectangleSize.x = rectangleSize.x - display.bounds.x;
    }

    // image processing
    sendIndex('start-screen-translation', rectangleSize, display.bounds, displayIndex);
});

// functions
function sendIndex(channel, ...args) {
    try {
        windowList['index'].webContents.send(channel, ...args);
    } catch (error) {
        console.log(error);
    }
}

function checkDirectory() {
    const directories = ['./json', './json/log', './json/setting', './json/text', './json/text_temp'];

    directories.forEach((value) => {
        try {
            if (!existsSync(value)) {
                mkdirSync(value);
            }
        } catch (error) {
            console.log(error);
        }
    });
}

function setKeyDown() {
    globalShortcut.register('CommandOrControl+F9', () => {
        try {
            // close window
            windowList['read-log'].close();
            windowList['read-log'] = null;
        } catch (error) {
            // create window
            createWindow('read-log');
        }
    });

    globalShortcut.register('CommandOrControl+F10', () => {
        try {
            windowList['config'].close();
            windowList['config'] = null;
        } catch (error) {
            // create window
            createWindow('config');
        }
    });

    globalShortcut.register('CommandOrControl+F11', () => {
        try {
            windowList['capture'].close();
            windowList['capture'] = null;
        } catch (error) {
            // create window
            createWindow('capture');
        }

    });

    globalShortcut.register('CommandOrControl+F12', () => {
        const window = windowList['index'];

        if (window.webContents.isDevToolsOpened()) {
            window.webContents.closeDevTools();
        } else {
            window.webContents.openDevTools({ mode: 'detach' });
        }
    });
}

function getWindowSize(type) {
    // set default value
    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;

    // get current display bounds
    let displayBounds = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds;

    // get current screen size
    let screenWidth = displayBounds.width;
    let screenHeight = displayBounds.height;

    switch (type) {
        case 'index':
            {
                // first time
                if (config.indexWindow.width < 0 || config.indexWindow.height < 0) {
                    config.indexWindow.width = parseInt(screenWidth * 0.2);
                    config.indexWindow.height = parseInt(screenHeight * 0.6);
                    config.indexWindow.x = displayBounds.x + parseInt(screenWidth * 0.7);
                    config.indexWindow.y = parseInt(screenHeight * 0.2);
                }

                x = config.indexWindow.x;
                y = config.indexWindow.y;
                width = config.indexWindow.width;
                height = config.indexWindow.height;
                break;
            }

        case 'config':
            {
                const indexBounds = windowList['index'].getBounds();
                width = parseInt(screenWidth * 0.22);
                height = parseInt(screenHeight * 0.65);
                x = getNearX(indexBounds, width);
                y = getNearY(indexBounds, height);
                break;
            }

        case 'capture':
            {
                // first time
                if (config.captureWindow.width < 0 || config.captureWindow.height < 0) {
                    config.captureWindow.x = displayBounds.x + parseInt(screenWidth * 0.33);
                    config.captureWindow.y = parseInt(screenHeight * 0.63);
                    config.captureWindow.width = parseInt(screenWidth * 0.33);
                    config.captureWindow.height = parseInt(screenHeight * 0.36);
                }

                x = config.captureWindow.x;
                y = config.captureWindow.y;
                width = config.captureWindow.width;
                height = config.captureWindow.height;
                break;
            }

        case 'capture-edit':
            {
                const indexBounds = windowList['index'].getBounds();
                width = parseInt(screenWidth * 0.27);
                height = parseInt(screenHeight * 0.35);
                x = getNearX(indexBounds, width);
                y = getNearY(indexBounds, height);
                break;
            }

        case 'edit':
            {
                const indexBounds = windowList['index'].getBounds();
                width = parseInt(screenWidth * 0.5);
                height = parseInt(screenHeight * 0.65);
                x = getNearX(indexBounds, width);
                y = getNearY(indexBounds, height);
                break;
            }

        case 'read-log':
            {
                const indexBounds = windowList['index'].getBounds();
                width = parseInt(screenWidth * 0.2);
                height = parseInt(screenHeight * 0.2);
                x = getNearX(indexBounds, width);
                y = getNearY(indexBounds, height);
                break;
            }

        default:
            break;
    }

    return {
        x: x >= displayBounds.x && x < displayBounds.x + displayBounds.width ? x : displayBounds.x,
        y: y >= 0 && y < displayBounds.y + displayBounds.height ? y : displayBounds.y,
        width: width,
        height: height
    };

    function getNearX(indexBounds, width) {
        return indexBounds.x - width > displayBounds.x ?
            indexBounds.x - width :
            indexBounds.x + indexBounds.width;
    }

    function getNearY(indexBounds, height) {
        return indexBounds.y + height > displayBounds.y + displayBounds.height ?
            displayBounds.y + displayBounds.height - height :
            indexBounds.y;
    }
}

// create window
function createWindow(type, data = null) {
    try {
        // get size
        const size = getWindowSize(type);

        // create new window
        const window = new BrowserWindow({
            show: false,
            x: size.x,
            y: size.y,
            width: size.width,
            height: size.height,
            transparent: true,
            frame: false,
            fullscreenable: false,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: path.join(__dirname, type + '.js')
            }
        });

        // load html
        window.loadFile(type + '.html');

        // set always on top
        const isTop = (type === 'index' || type === 'capture' || type === 'capture-edit');
        window.setAlwaysOnTop(isTop, 'screen-saver');

        // set minimizable
        window.setMinimizable(false);

        switch (type) {
            case 'index':
                window.once('close', () => {
                    // save position
                    config.indexWindow.x = window.getPosition()[0];
                    config.indexWindow.y = window.getPosition()[1];

                    // save size
                    config.indexWindow.width = window.getSize()[0];
                    config.indexWindow.height = window.getSize()[1];

                    // save config
                    saveConfig(config);

                    // save chat code
                    saveChatCode(chatCode);
                });
                break;

            case 'capture':
                window.once('close', () => {
                    // save position
                    config.captureWindow.x = window.getPosition()[0];
                    config.captureWindow.y = window.getPosition()[1];

                    // save size
                    config.captureWindow.width = window.getSize()[0];
                    config.captureWindow.height = window.getSize()[1];
                });
                break;

            default:
                break;
        }

        if (data) {
            window.webContents.on('did-finish-load', () => {
                window.webContents.send('send-data', data);
            });
        }

        window.webContents.on('did-finish-load', () => {
            window.show();
        });

        windowList[type] = window;
    } catch (error) {
        console.log(error);
    }
}