// Copyright CamControl by Daniel Cook brikbusters@gmail.com

let ptp = {
	info: null,
	activeConnection: false,
	handleErrors: true,

	initConnect: async function() {
		var status;
		try {
			status = await ptp.status();
			console.log(status);
			if (!status.initialized) {
				var r = await ptp.init();
				backend.buffer = r.buffer;
			}

			var en = (await ptp.getEnums()).resp;
			ptp.edata = en;
			ptp.e = {};
			for (var i = 0; i < en.length; i++) {
				ptp.e[en[i].name] = en[i].value;
			}
		} catch (e) {
			ui.popup("Couldn't perform a basic connection to the backend - either it's offline, or there is a major error<br>" + String(e));
			throw e;
		}

		await ui.tryConnect();
	},

	runProfile: async function(obj) {
		currentProfile = obj;

		if (!(ptp.activeConnection && ptp.ready)) {
			return;
		}

		var props = ["iso", "shutter speed", "aperture", "image format"];
		for (var i = 0; i < props.length; i++) {
			await ptp.setProperty(props[i], obj[props[i]]);
		}

		ptp.toast("Loaded properties from '" + obj.name + "'");
	},

	// Kill connection, assuming IO error
	kill: function() {
		ptp.activeConnection = false;
		ptp.ready = false;
	},

	crashReason: null,

	throwErr: function(code) {
		switch (code) {
		case ptp.err.NO_DEVICE:
			ptp.kill();
			ptp.crashReason = "No device connected.";
			throw new Error(ptp.crashReason);
		case ptp.err.NO_PERM:
			ptp.kill();
			ptp.crashReason = "Don't have IO permission.";
			throw new Error(ptp.crashReason);
		case ptp.err.OPEN_FAIL:
			ptp.kill();
			ptp.crashReason = "Device open/acquisition failure. Is something else using it?";
			throw new Error(ptp.crashReason);
		case ptp.err.OUT_OF_MEM:
			ptp.crashReason = "Out of memory.";
			throw new Error(ptp.crashReason);
		case ptp.err.IO_ERR:
			ptp.kill();
			ptp.crashReason = "I/O Error.";
			throw new Error("I/O Error.");
		case ptp.err.UNSUPPORTED:
			ptp.toast("Unsupported operation attempted");
			throw new Error("Unsupported operation attempted");
		case ptp.err.PTP_CHECK_CODE:
			ui.log("Non OK response code");
			break;
		}
	},

	checkRetCode: async function() {
		var c = (await ptp.getReturnCode()).code;
		if (ptp.e.OK != c) {
			throw Error("Error code is 0x" + c.toString(16));
		}
	},

	dateLong: function(s) {
		if (s == "") return s;
		var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul","Aug", "Sep", "Oct", "Nov", "Dec"];
		var year = s.substring(2, 4);
		var month = s.substring(6, 4);
		var day = s.substring(8, 6);
		var hour = s.substring(11, 9);
		var minute = s.substring(13, 11);
		return months[Number(month - 1)] + " " + day + " '" + year + " " + hour + ":" + minute;
	},

	// Enums - to be filled by backend
	e: null,

	err: {
		OK: 0,
		NO_DEVICE: -1,
		NO_PERM: -2,
		OPEN_FAIL: -3,
		OUT_OF_MEM: -4,
		IO_ERR: -5,
		RUNTIME_ERR: -6,
		UNSUPPORTED: -7,
		CHECK_CODE: -8,
	},

	devs: {
		EMPTY: 0,
		EOS: 1,
		CANON: 2,
		NIKON: 3,
		SONY: 4,
		FUJI: 5,
		PANASONIC: 6,
	},

	lv: {
		NONE: 0,
		EOS: 1,
		CANON: 2,
		ML: 3,
	},

	formats: {
		ETC: 0,
		RAW: 1,
		JPG: 2,
		RAW_JPG: 3,
	},

	liveviewFrames: 0,

	// Whether PTP is ready for events / liveview (session opened, got info)
	ready: false,

	// TODO: Use backend.buffer for buffer size
	download: async function(handle) {
		if (!ptp.activeConnection || !ptp.ready) return;

		// TODO: Uint8Array?
		var combined = [];

		var max = 0;
		//while ()
		//var r = await ptp.getPartialObject(handle, offset, max);
	},

	capture: async function() {
		if (!ptp.activeConnection || !ptp.ready) return;

		if (getSetting("focus mode") != "MF") {
			ptp.toast("Turn auto-focus off.");
			return;
		}

		await ptp.preTakePicture();

		if (getSetting("focus mode") == "AF") {
			await new Promise(function(resolve, reject) {
				waitForEvent(resolve, function(prop) {
					return prop == "FocusInfoEx";
				});
			});
		}

		await ptp.takePicture();
	},

	// To be handled by the function reading events
	waitFunction: null,
	waitCondition: null,
	waitForEvent: function(callback, condition) {
		ptp.waitFunction = callback;
		ptp.waitCondition = condition;
	},

	runWaits: function(props) {
		if (!ptp.waitFunction) return;
		for (var i = 0; i < props.length; i++) {
			if (ptp.waitCondition([i][0])) {
				ptp.waitFunction();
				ptp.waitFunction = null;
				ptp.waitCondition = null;
			}
		}
	},
};
