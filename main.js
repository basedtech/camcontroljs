// Copyright CamControl by Daniel Cook brikbusters@gmail.com
// Starter file for CamControl index.html

window.onresize = function() {
	ui.canvas.width = window.innerWidth;
	ui.canvas.height = window.innerHeight;

	if (backend.isAndroid) {
		backend.updateScreen();
	}
}

// Update the UI to the settings from the last session
function populateLastSettings() {
	var props = [];
	var dummy = ["iso", "shutter speed", "aperture", "image format"];
	for (var i = 0; i < dummy.length; i++) {
		var s = getSetting(dummy[i]);
		if (s != null) {
			props.push([dummy[i], s]);
		}
	}

	ui.applyPropertyCodes(props);
}

// main() only called once
async function main() {
	initializeSettings();
	populateLastSettings();

	ui.updateLvBtn();
	ui.initButtons();

	startTask(evtsk, getSetting("fpsIC"));

	if (!backend.isAndroid) {
		ui.initCanvas();
	}

	await ptp.initConnect();
}

// Sanity checks
if (typeof(Promise) == "function") {
	main();
} else {
	document.write("Your webview/browser is unsupported");
}
