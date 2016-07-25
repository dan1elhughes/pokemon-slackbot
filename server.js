const SlackBot = require('slackbots');
const request = require('request-promise');
const distance = require('haversine');
const humanize = require('humanize');
const species = require('./conf/species');

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

let getNearby = (start) => new Promise(resolve => {
	let uri = `${api}/${start.latitude}/${start.longitude}`;
	let json = true;

	request({ uri, json }).then(data => {
		if (typeof data.pokemon === 'undefined') {
			console.log('Unable to read from API');
			resolve(false);
		} else {
			resolve(data.pokemon.map(p => ({
				id: p.pokemonId,
				name: species[p.pokemonId],
				distance: Math.round(distance(start, {
					latitude: p.latitude,
					longitude: p.longitude
				}) * 1000),
				ttl: humanize.relativeTime(p.expiration_time)
			})));
		}
	});
});

let pad = number => number <= 999 ? ("00"+number).slice(-3) : number;

let cache = {};
let scan = () => {
	getNearby(COORDS).then(result => {
		console.log(`Got ${result.length} results`);

		if (result === false) {
			if (!cache.offline) {
				bot.postMessage(CHANNEL, '`Unable to reach API. Sleeping...`', opts);
				cache.offline = true;
			}
		} else {
			if (cache.offline) {
				bot.postMessage(CHANNEL, '`API back online. Restarting scanner...`', opts);
			}

			cache.offline = false;

			result.sort((a, b) => a.distance - b.distance);

			var isEqual = (a, b) => a.id === b.id && a.distance === b.distance;

			result = result.filter((item, i, arr) => !i || isEqual(item, arr[i - 1]));
			console.log(`Got ${result.length} non-duplicates`);

			result = result.filter(p => p.distance < CATCH_THRESHOLD);
			console.log(`Got ${result.length} nearby`);

			Object.keys(cache).forEach(k => {
				if (cache[k]-- === 0) {
					delete cache[k];
				}
			});

			var cacheCount = Object.keys(cache).length;
			result = result.filter(p => {
				var key = p.id + '/' + p.distance;
				var isNew = typeof cache[key] === 'undefined';

				if (isNew) {
					cache[key] = 20;
				}

				return isNew;
			});

			console.log(cache);
			console.log(`Got ${result.length} new (${cacheCount} in cache)`);
			console.log(`New pokeys: ${result.map(p => `${p.name} (${p.id}/${p.distance})`).join("\n")}`);

			result.forEach(p => {
				p.name = p.name.toUpperCase();

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
			});
		}
	});
};

bot.on('start', () => {
	bot.postMessage(CHANNEL, `\`Starting [interval: ${INTERVAL_MS}ms, range: ${CATCH_THRESHOLD}m]\``, opts);
	scan();
	setInterval(scan, INTERVAL_MS);
});
