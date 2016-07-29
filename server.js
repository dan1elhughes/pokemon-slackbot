const request = require('request-promise');
const distance = require('haversine');
const humanize = require('humanize');
const assert = require('assert');
const species = require('./conf/species');

require('dotenv').load({
	silent: true,
});

const CATCH_THRESHOLD = process.env.CATCH_THRESHOLD || 75;
const INTERVAL_MS = process.env.INTERVAL_MS || 60000;

const messageAdapter = require(`./adapters/${process.env.MESSAGE_ADAPTER || 'console'}`);
assert(messageAdapter.debug, 'Message adapter must implement debug(msg)');
assert(messageAdapter.send, 'Message adapter must implement send(msg)');

assert(process.env.LAT, 'environment variable LAT not set');
assert(process.env.LNG, 'environment variable LNG not set');
const LAT = process.env.LAT;
const LNG = process.env.LNG;


let api = 'https://pokevision.com/map/data';

let getNearby = (lat, lng) => new Promise(resolve => {
	let uri = `${api}/${lat}/${lng}`;
	let json = true;

	request({
		uri,
		json
	}).then(data => {
		if (typeof data.pokemon === 'undefined') {
			console.log('Unable to read from API');
			resolve(false);
		} else {
			resolve(data.pokemon.map(p => ({
				id: p.pokemonId,
				name: species[p.pokemonId],
				distance: Math.round(distance({
					latitude: lat,
					longitude: lng
				}, {
					latitude: p.latitude,
					longitude: p.longitude
				}) * 1000),
				ttl: humanize.relativeTime(p.expiration_time)
			})));
		}
	});
});

let cache = {};
let scan = () => {
		getNearby(LAT, LNG).then(result => {
					console.log(`Got ${result.length} results`);

					if (result === false) {
						if (!cache.offline) {
							messageAdapter.debug('Unable to reach API. Sleeping...');
							cache.offline = true;
						}
					} else {
						if (cache.offline) {
							messageAdapter.debug('Unable to reach API. Sleeping...');
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

				messageAdapter.send(p);
			});
		}
	});
};

var main = function () {
	messageAdapter.debug(`Starting [interval: ${INTERVAL_MS}ms, range: ${CATCH_THRESHOLD}m]`);
	scan();
	setInterval(scan, INTERVAL_MS);
};

if (typeof messageAdapter.start === 'function') {
	messageAdapter.start().then(main).catch(console.error.bind(console));
} else {
	main();
}
