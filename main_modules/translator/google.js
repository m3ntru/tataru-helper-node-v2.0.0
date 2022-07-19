'use strict';

// request module
const { startRequest } = require('./request-module');

// google encoder
const { tokenEncoder } = require('./googleEncoder');

// user agent
const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36';

// translate
async function exec(option) {
    let result = '';

    const path =
        `/translate_a/single?client=webapp&sl=${option.from}&tl=${option.to}&hl=${option.to}` +
        `&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=sos&dt=ss&dt=t&otf=2&ssel=0&tsel=0&kc=3` +
        `&tk=${tokenEncoder(option.text)}&q=${option.text}`;

    const callback = function (response, chunk) {
        if (response.statusCode === 200) {
            const data = JSON.parse(chunk.toString());
            if (data[0] && data[0][0] && data[0][0][0]) {
                return data[0][0][0];
            }
        }
    };

    try {
        result = await startRequest({
            options: {
                method: 'GET',
                protocol: 'https:',
                hostname: 'translate.google.com',
                path: encodeURI(path),
            },
            headers: [
                ['user-agent', userAgent],
                ['referer', 'https://translate.google.com/'],
            ],
            callback: callback,
        });
    } catch (error) {
        console.log(error);
    }

    return result;
}

exports.exec = exec;
