const SlackBot = require('slackbots');
const assert = require('assert');

assert(process.env.SLACK_CHANNEL, 'environment variable SLACK_CHANNEL not set');
const CHANNEL = process.env.SLACK_CHANNEL;

assert(process.env.SLACK_API_KEY, 'environment variable SLACK_API_KEY not set');
const API_KEY = process.env.SLACK_API_KEY;

SlackBot.prototype.postAttachment = function (id, attachments, params) {
	params = require('extend')({
		attachments: attachments,
		channel: id,
		username: this.name
	}, params || {});

	return this._api('chat.postMessage', params);
};

let bot = new SlackBot({
	token: API_KEY,
	name: 'Pokébot'
});

let opts = {
	icon_url: 'https://lh6.ggpht.com/YphYdqVDuLK4ZY-tCpdCdl3ZbES-hXfozgfamNQcYXmLZKLTA86Xe_2bhOCjc097fCA=w300'
};

let pad = number => number <= 999 ? ("00" + number).slice(-3) : number;

let debug = msg => bot.postMessage(CHANNEL, `\`${msg}\``, opts);

let send = p => {
	let attachments = [{
		thumb_url: `http://sprites.pokecheck.org/i/${pad(p.id)}.gif`,
		fallback: `A wild ${p.name} appeared! (${p.distance} away, gone ${p.ttl})`,
		pretext: `A wild ${p.name} appeared!`,
		fields: [{
			title: "Distance",
			value: `${p.distance}m away`,
			short: true
		}, {
			title: "Disappears",
			value: `${p.ttl}`,
			short: true
		}]
	}];

	bot.postAttachment(CHANNEL, attachments, opts, console.log.bind(console));
};

let start = () => new Promise(resolve => bot.on('start', resolve));

module.exports = {
	start,
	debug,
	send
};
