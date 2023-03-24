// Copyright CamControl by Daniel Cook brikbusters@gmail.com

var currentProfile = null;
var currentSettings = null;

var defaultSettings = {
	focusPrecision: 3,
	theme: "default",
	waitForMagicLantern: 1,
	renderCeiling: 50,
	fpsIC: 5, // fps for ev tsk
	fpsLiveview: 100,
	liveViewIsActive: false,
	directory: "default",
	imageCounter: 0,

	"iso": 0,
	"aperture": 0,
	"shutter speed": 0,
	"white balance": 0,
	"image format": 0,
	"mirror": null,
};

function newProfile(model, serial, name) {
	var p = JSON.parse(JSON.stringify(currentSettings));
	p.name = name;
	p.serial = serial;
	delete p.scripts;
	delete p.profiles;
	currentSettings.profiles.push(p);
}

function getSetting(name) {
	// if (currentProfile != null) {
		// if (currentProfile[name] == undefined) {
			// return defaultSetting[name];
		// }
		// return currentProfile[name];
	// }

	if (currentSettings[name] != undefined) {
		if (currentSettings[name] == undefined) {
			return defaultSetting[name];
		}
		return currentSettings[name];
	}

	return null;
}

function changeSetting(name, value) {
	if (currentProfile != null) {
		currentProfile[name] = value;
	}

	currentSettings[name] = value;
}

function applyDefault() {
	currentSettings = JSON.parse(JSON.stringify(defaultSettings));
	currentSettings.firstTime = true;
	currentSettings.profiles = [];
	currentSettings.scripts = [];
}

function initializeSettings() {
	if (backend.isAndroid) {
		try {
			currentSettings = JSON.parse(backend.getSettings());
		} catch (e) {
			ptp.toast("Corrupted settings, will reset");
			applyDefault();
			return;
		}

		if (Object.keys(currentSettings).length == 0) {
			applyDefault();
			return;
		}
	} else {
		applyDefault();
		return;
	}

	currentSettings.firstTime = false;

	// Fill in settings for new updates
	var defaultKeys = Object.keys(defaultSettings);
	for (var i = 0; i < defaultKeys.length; i++) {
		if (currentSettings[defaultKeys[i]] === undefined) {
			currentSettings[defaultKeys[i]] = defaultSettings[defaultKeys[i]];
		}
	}
}

function applySettings() {
	if (backend.isAndroid) {
		backend.setSettings(JSON.stringify(currentSettings));
	} else {
		
	}
}
