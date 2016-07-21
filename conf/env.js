require('dotenv').load({
	silent: true,
});

module.exports = {
	API_KEY: process.env.SLACK_API_KEY || 'API_KEY',
	CHANNEL: process.env.SLACK_CHANNEL || 'CHANNEL',
	CATCH_THRESHOLD: process.env.CATCH_THRESHOLD || 'CATCH_THRESHOLD',
	COORDS: {
		latitude: process.env.LAT || 'LAT',
		longitude: process.env.LNG || 'LNG'
	},
	INTERVAL_MS: process.env.INTERVAL_MS || 'INTERVAL_MS'
};
