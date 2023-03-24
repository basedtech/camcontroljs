// Copyright CamControl by Daniel Cook brikbusters@gmail.com

defaultSettings = {
	theme: "default",
	waitForMagicLantern: 1,
};

var int = {
	bulbBtn: document.getElementById("bulb-button"),
	stdBtn: document.getElementById("std-button"),

	bulb: document.getElementById("screen-bulb"),
	std: document.getElementById("screen-std"),
	script: document.getElementById("screen-script"),

	currSelect: null,
	selectBulb: document.getElementById("select-bulb"),
	selectStd: document.getElementById("select-std"),
	selectScript: document.getElementById("select-script"),

	selects: ["bulbStart", "bulbShots", "bulbBetween", "bulbExp",
		"stdStart", "stdShots", "stdBetween"],

	val: function(name) {
		return document.getElementById(name).value;
	},

	initSelects: function() {
		if (getSetting("script")) {
			document.getElementById("script").value = getSetting("script");
		}

		for (var i = 0; i < int.selects.length; i++) {
			var e = document.getElementById(int.selects[i]);
			if (getSetting("script")) {
				e.value = getSetting(int.selects[i]);
			} else {
				if (Number(e.min > 0)) {
					e.value = e.min
				} else {
					e.value = 0;
				}
				changeSetting(int.selects[i], Number(e.value));
			}
		}
	},

	setupButtons: function() {
		int.selectBulb.onclick = function() {
			int.showScreen("bulb");
		}
		int.selectStd.onclick = function() {
			int.showScreen("std");
		}
		int.selectScript.onclick = function() {
			int.showScreen("script");
		}
	},

	showScreen: function(text) {
		int.currSelect = text;
		int.bulb.style.display = "none";
		int.std.style.display = "none";
		int.script.style.display = "none";
		int.selectBulb.className = "select off";
		int.selectStd.className = "select off";
		int.selectScript.className = "select off";
		if (text == "bulb") {
			int.bulb.style.display = "block";
			int.selectBulb.className = "select on";
		} else if (text == "std") {
			int.std.style.display = "block";
			int.selectStd.className = "select on";
		} else if (text == "script") {
			int.script.style.display = "block";
			int.selectScript.className = "select on";
		}
	},

	applyProps: function(list) {
		if (list == undefined) {
			return;
		}

		var temp = "";
		for (var p = 0; p < list.length; p++) {
			var value = list[p][1];
			switch (list[p][0]) {
			case "focus mode":
				changeSetting("focus mode", value);
				break;
			case "shutter speed":
				changeSetting("shutter speed", value);
				break;
			}
		}
	},

	status: function(str) {
		document.getElementById("status").innerText = str;
	},

	name: "interv",
	init: async function() {
		ptp.info = (await ptp.getDeviceInfo()).resp;
		ptp.vendor = (await ptp.getDeviceType()).resp;

		int.status("Connected to " + ptp.info.model);

		document.getElementById("status-box").style.background = "#77d777";

		if (ptp.vendor == ptp.devs.EOS) {
			await ptp.EOSSetRemoteMode(1);
			await ptp.EOSSetEventMode(1);
		}

		var props = await ptp.getEvents();

		// Small fix for EOS cameras
		if (ptp.vendor == ptp.devs.EOS) {
			if (props.resp.length == 1 || props.resp[0][0] == "InfoCheckComplete") {
				await ptp.EOSSetRemoteMode(1);
				await ptp.EOSSetEventMode(1);
				props = await ptp.getEvents();
			}

			int.applyProps(props.resp);
		}

		if (ptp.vendor != ptp.devs.EOS) {
			int.status(ptp.info.model + " isn't EOS and is sadly not supported.");
		}
	},

	inc: 0,

	loop: async function() {
		var props = await ptp.getEvents();
		int.applyProps(props.resp);

		// Apply settings every frame
		for (var i = 0; i < int.selects.length; i++) {
			changeSetting(int.selects[i], int.val(int.selects[i]));
		}

		// Apply every 8 or so seconds
		if (this.inc > 50) {
			applySettings();
			this.inc = 0;
		} else {
			this.inc++;
		}
	},

	timeout: null,
	interval: null,
	picsTaken: 0,

	startBulb: function() {
		int.picsTaken = 0;
		int.status("Waiting " + String(int.val("bulbStart")) + " seconds");
		if (Number(int.val("bulbShots")) == 0) {
			int.status("Must take at least 1 shot.");
			return;
		}

		if (Number(int.val("bulbExp")) == 0) {
			int.status("Can't expose for 0 seconds.");
			return;
		}

		if (getSetting("focus mode") != "MF") {
			int.status("Turn auto-focus off.");
			return;
		}

		int.bulbBtn.innerText = "Cancel sequence";
		int.bulbBtn.onclick = function() {
			clearTimeout(int.timeout);
			int.resetButtons();
		}

		int.timeout = setTimeout(async function() {
			await ptp.setProperty("shutter speed", 0);
			await sleep(100);
		
			for (int.picsTaken = 0; int.picsTaken < int.val("bulbShots"); int.picsTaken++) {
				try {
					await ptp.bulbStart();
					await sleep((Number(int.val("bulbExp")) + 1) * 1000);
					await ptp.bulbStop();
				} catch (e) {
					int.status("Couldn't start bulb. Make sure you are in (M) mode." + String(e));
					clearInterval(int.timeout);
					clearInterval(int.interval);
					int.resetButtons();
					return;
				}

				int.status("Taken " + String(int.picsTaken + 1) + " pictures");
				await sleep(int.val("bulbBetween") * 1000);

				if (int.cancel) {
					int.cancel = false;
					clearTimeout(int.timeout);
					int.resetButtons();
					return;
				}
			}

			int.status("Done taking pictures.");
			int.resetButtons();
		}, int.val("bulbStart") * 1000);
	},

	runScript: async function() {
		var script = document.getElementById("script").value;
		changeSetting("script", script);
		document.getElementById("script-result").innerText = await runScript(script);
	},

	startStd: function() {
		int.picsTaken = 0;
		int.status("Waiting " + String(int.val("stdStart")) + " seconds");
		if (Number(int.val("stdShots")) == 0) {
			int.status("Must take at least 1 shot.");
			return;
		}

		if (getSetting("focus mode") != "MF") {
			int.status("Turn auto-focus off!");
			return;
		}

		if (getSetting("shutter speed") == 0 || getSetting("shutter speed") > 5000) {
			int.status("Can only do short shutter speeds.");
		}

		int.stdBtn.innerText = "Cancel sequence";
		int.stdBtn.onclick = function() {
			clearTimeout(int.timeout);
			int.resetButtons();
			int.cancel = true;
		}

		int.timeout = setTimeout(async function() {		
			for (int.picsTaken = 0; int.picsTaken < int.val("stdShots"); int.picsTaken++) {
				int.status("Taking picture...");
				try {
					await ptp.preTakePicture();
					await ptp.takePicture();
				} catch (e) {
					int.status("Failed to take a picture: " + String(e));
					return;
				}

				int.status("Taken " + String(int.picsTaken + 1) + " pictures");
				await sleep(int.val("stdBetween") * 1000);

				if (int.cancel) {
					int.cancel = false;
					clearTimeout(int.timeout);
					int.resetButtons();
					return;
				}
			}

			int.status("Done taking pictures.");
			int.resetButtons();
		}, int.val("stdStart") * 1000);
	},

	stdSingle: async function() {
		if (getSetting("focus mode") != "MF") {
			int.status("Turn auto-focus off.");
			return;
		}
		
		await ptp.preTakePicture();
		await ptp.takePicture();
	},

	resetButtons: function() {
		int.bulbBtn.innerText = "Start sequence";
		int.bulbBtn.onclick = function() {
			int.startBulb();
		}

		int.stdBtn.innerText = "Start sequence";
		int.stdBtn.onclick = function() {
			int.startStd();
		}
	}
}

async function main() {
	int.resetButtons();
	initializeSettings();
	int.setupButtons();
	int.initSelects();
	int.showScreen("script");

	ui.startConnection = async function() {
		await ptp.reset();
		await ptp.openSession();
		ptp.ready = true;
		await startTask(int, 1);
	}
	
	await ptp.initConnect();
}

main();
