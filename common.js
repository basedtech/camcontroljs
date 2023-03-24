function closeThis(e) {
	var popup = e.parentElement.parentElement.parentElement;
	popup.getElementsByClassName("button")[0].click();
}

function parseScript(string) {
	var object = null;
	try {
		object = eval("[" + string + "]")[0];
	} catch (e) {
		return String(e);
	}

	if (object == undefined) {
		return "No code";
	}

	if (object.name == undefined) {
		return "'name' not defined";
	}

	if (object.init == undefined) {
		return "'init' not defined";
	}

	return object;
}

async function runScript(string) {
	var object = parseScript(string);
	if (typeof(object) != "object") {
		try {
			var r = await eval("(async function main () {\n" + string + "})();");
			if (r == undefined) {
				return "Success";
			} else {
				return r;
			}
		} catch (e) {
			return String(e);
		}
	}

	if (object.loop) {
		return await startTask(object, 1);
	}

	try {
		await object.init();
	} catch (e) {
		return String(e);
	}

	return "Ran script without errors";
}

function saveScript(string) {
	var object = parseScript(string);
	if (typeof(object) != "object") {
		return object;
	}

	currentSettings.scripts.push({
		name: object.name,
		text: string,
		runOnStartup: false
	});
}

function newFileName() {
	var curr = getSetting("imageCounter");
	var file = backend.getDirectory() + "CAM_" + String(curr);
	changeSetting("imageCounter", Number(curr) + 1);
	return file;
}

function newImageName() {
	return newFileName() + ".jpg";
}
