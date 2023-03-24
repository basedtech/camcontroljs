// Copyright CamControl by Daniel Cook brikbusters@gmail.com

var tasks = [];

async function sleep(ms) {
	await new Promise(r => setTimeout(r, ms));
}

var queue = {
	// Semaphore like system for backend requests (very slow)
	flag: 0,
	wait: async function() {
		if (queue.flag == 0) return;
		return new Promise(resolve => {var interval = setInterval(function() {
			if (!ptp.activeConnection) {
				clearInterval(interval);
				resolve(1);
			} else if (queue.flag == 0) {
				clearInterval(interval);
				resolve(0);
			}
		}, 0)});
	},

	// Stuff for backend (Android) faster async requests
	reqID: 0,
}

async function startTask(object, fps) {
	try {
		await object.init();
	} catch (e) {
		throw e;
		return;
	}

	object.error = 0;
	object.interval = null;
	if (!object.fps) object.fps = fps;
	object.time = 0;
	object.id = tasks.length;

	tasks.push(object);

	// Create a worker task (thread) that runs at a constant FPS
	object.interval = setTimeout(async function(obj) {
		while (1) {
			var t = new Date().getTime();

			try {
				await obj.loop();
			} catch (e) {
				obj.error++;
				ui.log(e, "Stopped " + obj.name + " task");
				if (obj.name == "core" || obj.name == "files" || obj.name == "interv") {
					ui.tryConnect(ptp.crashReason);
				}

				clearInterval(obj.interval);
				tasks.splice(obj.id, 1);
				return;
			}

			var t2 = new Date().getTime();
			obj.time = t2 - t;

			var delay = (1000 / obj.fps) - obj.time;
			if (delay < 0) {
				delay = 0;
			}

			// Run at 60fps
			await new Promise(r => setTimeout(r, delay));
		}
	}, 0, object);

	ui.log("Started " + object.name + " task");
}
