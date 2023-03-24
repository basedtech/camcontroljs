// Copyright CamControl by Daniel Cook brikbusters@gmail.com

if (window.backend === undefined) {
	window.backend = {};
}

backend.isAndroid = String(window.location).includes("?android");
backend.isLinux = backend.isAndroid == false;
backend.isWindows = backend.isAndroid == false;
backend.isInterv = String(window.location).includes("intervalometer");
backend.isFiles = String(window.location).includes("files");

backend.getDirectory = function() {
	var setting = getSetting("directory");
	if (backend.isAndroid) {
		if (setting == "camera") {
			return backend.getDCIM() + "Camera/";
		} else if (setting == "default") {
			var dir = backend.getDCIM() + "CamControl/";
			backend.createDir(dir);
			return dir;
		}
	} else {
		if (setting == "default") {
			return "";
		}
	}

	return null;
}

// set ptp.bindRequest()
if (backend.isAndroid) {
	if (document.getElementById("liveview") != null) {
		document.getElementById("liveview").style.display = "none";
	}

	// JNI halts browser, create a semaphore system
	ptp.bindRequest = async function(url) {
		var id = "call" + queue.reqID;
		var result = new Promise(function(resolve, reject) {
		    queue[id] = resolve;
		    queue.reqID++;
		    if (queue.reqID > 1000) queue.reqID = 0;
		});

		if (backend.bindAdd(url, id)) {
		    console.log("Request filled, backing up");
		}

		result = await result;

		delete queue[id];

        var json = null;
		try {
			json = JSON.parse(result);
		} catch (e) {
			ui.log("Error parsing response JSON: " + result);
			throw "Backend JSON error";
		}

		if (ptp.handleErrors) {
			ptp.throwErr(json.error);
		}

		return json;
	};

	ptp.toast = function(str) {
		backend.toast(str);
	};
} else {
	ptp.bindRequest = async function(url) {
		ptp.queueFlag = true;

		var json = null;
		try {
			var r = await fetch("/" + url);
			var json = await r.json();
			ptp.queueFlag = false;
		} catch (e) {
			ptp.queueFlag = false;
			throw Error("Network error while running '" + url + "'" + String(e));
		}

		if (json == "404") {
			throw Error("Backend network error 404");
		}

		if (ptp.handleErrors) {
			ptp.throwErr(json.error);
		}
	
		return json;
	};

	ptp.toast = function(string) {
		ptp.toastMsg = string;
	};
}

if (!backend.isAndroid || (backend.isFiles || backend.isInterv)) {
	var style = document.createElement("STYLE");
	style.innerHTML = "html, body {background-color: #4f4f4f;}";
	document.getElementsByTagName("HEAD")[0].appendChild(style);
}

function evalParams(params) {
	var out = ";";
	for (var i = 0; i < params.length; i++) {
		if (i != 0) out += ",";
		if (typeof(params[i]) == "number") {
			out += String(params[i]);
		} else if (typeof(params[i]) == "string") {
			out += "\"" + params[i] + "\"";
		} else if (typeof(params[i] == "object")) {
			// TODO: Parse byte arrays
		}
	}
	
	// out += ";";

	return out;
}

// Define PTP naming scheme
function snakeToCamel(str) {
	var split = str.split("_");
	var out = "";
	for (var i = 0; i < split.length; i++) {
		if (split[i] == "liveview") {
			split[i] = "LiveView";
		} else if (split[i] == "ids") {
			split[i] = "IDs";
		} else if (split[i] == "eos") {
			split[i] = "EOS";
		}

		if (i != 0) {
			var t = split[i].split("");
			t[0] = t[0].toUpperCase();
			split[i] = t.join("");
		}

		out += split[i];
	}

	return out;
}

ptp.bindRequestArgs = async function(req, args) {
	return ptp.bindRequest(req + evalParams(args));
}

function createStubs(arr) {
	for (var i = 0; i < arr.length; i++) {
		var bind = "ptp_" + arr[i];
		var camelCase = snakeToCamel(arr[i]);
		eval("ptp." + camelCase + ` = async function(...args) {
			return await ptp.bindRequestArgs("` + bind + `", args);
		}`);
	}
}

createStubs(["status", "init", "get_enums", "reset", "connect", "open_session", "close_session",
	"get_device_info", "mirror_up", "mirror_down", "bulb_start", "bulb_stop", "get_liveview_frame",
	"get_liveview_type", "init_liveview", "deinit_liveview", "get_device_type", "get_return_code",
	"get_storage_ids", "get_events", "get_thumbnail", "eos_remote_release",
	"pre_take_picture", "take_picture", "get_all_props"]);

createStubs(["set_property", "drive_lens", "get_storage_info", "get_object_handles", "get_object_info",
	"eos_set_remote_mode", "eos_set_event_mode", "custom", "get_partial_object", "download_file"]);

ptp.disconnect = async function() {
	var x = await ptp.bindRequest("ptp_disconnect");
	ptp.kill();
	return x;
}

ptp.getLiveViewJPG = async function(val) {
	ptp.queueFlag = true;
	var r = await fetch("/ptp_get_liveview_frame.jpg");
	ptp.queueFlag = false;

	if (Number(r.headers.get("Content-Length")) == 12) {
		return null;
	}

	return r;
}
