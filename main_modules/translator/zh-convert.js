const { readFileSync } = require('fs');
const { resolve } = require('path');
const zhTables = JSON.parse(readFileSync(resolve('./json/zh-convert.json')).toString());

function exec(option = { text: '', tableName: 'zh2Hant' }) {
    return replaceText(option.text, zhTables[option.tableName]);
}

function replaceText(text = '', zhTable = []) {
    for (let index = 0; index < zhTable.length; index++) {
        text = text.replaceAll(zhTable[index][0], zhTable[index][1]);
    }

    return text;
}

exports.exec = exec;
