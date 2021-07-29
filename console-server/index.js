const app = require('http').createServer();
const {version} = require('../package.json');
const fs = require("fs");
const path = require("path");

var logFiles = {};

require('custom-env').env(process.env.NODE_ENV || 'development');

if (process.env.USE_PORT) process.env.SERVER_PORT = process.env.USE_PORT;
const ignoreList = process.env.IGNORE_CHANNELS ? process.env.IGNORE_CHANNELS.split(',') : [];

const io = require('socket.io')(app, {
	cors: {
		methods: ['GET', 'POST'],
	},
});

// eslint-disable-next-line no-console
console.log(
	`\nRemote Console Personal Server ver: ${version} host: ${process.env.SERVER_PROTOCOL}://${process.env.SERVER_DOMAIN
	} env: ${process.env.NODE_ENV ? process.env.NODE_ENV : 'development'} ${process.env.SERVER_PORT ? `port: ${process.env.SERVER_PORT}` : 81
	}`
);

app.listen(process.env.SERVER_PORT || 81);
io.serveClient(false);
io.use((socket, next) => {
	if (socket.request.headers['x-consolere']) return next();
	return next(new Error('Authentication error'));
});

io.on('connection', function (socket) {
	socket.on('command', function (data) {
		if (!data.channel) data.channel = 'public';
		socket.broadcast.to(data.channel).emit('toConsoleRe', data);
	});

	socket.on('channel', function (channel) {
		socket.join(channel);
		if (!ignoreList.includes(channel)) {
			socket.join(channel);
			// eslint-disable-next-line no-console
			console.info('join channel:', channel);
		}
	});

	socket.on('toServerRe', function (data, cb) {
		if (!data.channel) data.channel = 'public';

		// Log to file
		const fileName = path.resolve(__dirname, '../log/', `${data.channel}.log`)
		const content = `${Date()}: ${data.args}\n`
		fs.appendFile(fileName, content, err => {
			if (err) {
				console.error(err);
				return
			}
		});


		if (data.loopback) {
			io.to(data.channel).emit('toConsoleRe', data);
		} else {
			socket.broadcast.to(data.channel).emit('toConsoleRe', data);
		}
		if (cb !== undefined) cb('success');
	});
});

