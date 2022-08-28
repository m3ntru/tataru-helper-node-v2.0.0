const tmi = require("tmi.js");
const config = require("./tmi-config.json");

class TmiHandler {
  constructor() {
    this.connected = false;
    this.client = null;
  }

  async connect() {
    console.log(config);
    this.connected = false;
    this.client = new tmi.Client({
      options: {debug: true},
      identity: {
        username: config.twitch.username,
        password: config.twitch.password,
      },
      channels: [config.twitch.channel],
    });
    return new Promise((resolve, reject) => {
      this.client
        .connect()
        .then((data) => {
          console.log(data);
          this.connected = true;
          this.client.say(config.twitch.channel, `已載入 ${config.twitch.channel} 聊天室`);
          resolve(this);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  }

  async disconnect() {
    this.connected = false;
    this.client = null;
  }

  async send(message) {
    if (this.connected) {
      this.client.say(config.twitch.channel, message);
    }
  }
}

module.exports = TmiHandler;
