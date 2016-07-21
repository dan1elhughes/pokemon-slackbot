const SlackBot = require('slackbots');
const request = require('request-promise');
const distance = require('haversine');
const humanize = require('humanize');

const {
	API_KEY,
	CATCH_THRESHOLD,
	CHANNEL,
	COORDS,
	INTERVAL_MS
} = require('./conf/env');

let api = 'https://pokevision.com/map/data';

let opts = {
	icon_url: 'https://lh6.ggpht.com/YphYdqVDuLK4ZY-tCpdCdl3ZbES-hXfozgfamNQcYXmLZKLTA86Xe_2bhOCjc097fCA=w300'
};

SlackBot.prototype.postAttachment = function(id, attachments, params) {
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

let getName = (id) => {
	return new Promise(resolve => {
		request(`https://pokeapi.co/api/v2/pokemon-species/${id}/`, {
			json: true
		}).then(data => {
			resolve(data.name);
		});
	});
};

let getNearby = (start) => new Promise(resolve => {
	let uri = `${api}/${start.latitude}/${start.longitude}`;
	let json = true;
	let opts = {
		uri,
		json
	};

	request(opts).then(data => {
		resolve(data.pokemon.map(p => ({
			id: p.pokemonId,
			name: getName(p.pokemonId),
			distance: Math.round(distance(start, {
				latitude: p.latitude,
				longitude: p.longitude
			}) * 1000),
			ttl: humanize.relativeTime(p.expiration_time)
		})));
	});
});

let scan = () => {
	getNearby(COORDS).then(function (result) {
		console.log(`Got ${result.length} results`);

		result = result.filter(p => p.distance < CATCH_THRESHOLD);

		result.sort((a, b) => a.distance - b.distance);

		console.log(`Got ${result.length} nearby`);

		result.forEach(p => {
			p.name.then(name => {

				console.log(`Got details for ${name}`);
				p.name = name.toUpperCase();

				let attachments = [{
						thumb_url: `https://pokeapi.co/media/sprites/pokemon/${p.id}.png`,
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

				bot.postAttachment(CHANNEL, attachments, opts);
			});
		});

	});
};

bot.on('start', () => {
	bot.postMessage(CHANNEL, `\`Starting [interval: ${INTERVAL_MS}ms, range: ${CATCH_THRESHOLD}m]\``, opts);
	scan();
	setInterval(scan, INTERVAL_MS);
});
