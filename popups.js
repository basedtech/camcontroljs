// Copyright CamControl by Daniel Cook brikbusters@gmail.com

ui.startConnection = async function() {
	await ptp.reset();
	ptp.crashReason = null;
	ptp.activeConnection = true;
	await startTask(core, getSetting("fpsLiveview"));
}

// Define reason to show if we're trying to reconnect
// after an IO error
ui.tryConnect = async function(reason) {
	// Try to re-open session if already connected
	if (reason == undefined) {
		var status = await ptp.status();
		
		if (status.initialized && status.connected) {
			ui.log("Already connected, closing and resuming");
			try {
				await ptp.closeSession();
				await ui.startConnection();
				return;
			} catch (e) {
				ui.log("Error when tring to regain connection");
				//reason = String(e);
				// Device offline: (try again) show IO error, exit
				// Device online: Reinitialize connection
			}
		}
	}

	var content = document.createElement("DIV");
	content.className = "popup-content";

	if (reason != undefined) {
		reason = "Disconnected because: " + reason;
	} else {
		try {
			await ptp.connect();
			await ui.startConnection();
			ptp.activeConnection = true;
		} catch (e) {
			ui.log(e);
			reason = String(e);
		}
	}

	if (reason != undefined) {
		ui.popup(content, true);
		content.innerHTML =
`
<img width="110" src='icons/camcontrol.png'>
<p id="connect-fail" class="failed">` + reason + `</p>
`;
		var btn = document.createElement("DIV");
		btn.innerText = "Reconnect";
		btn.className = "button";
		content.appendChild(btn);

		btn.onclick = async function() {
			try {
				await ptp.connect();
				await ui.startConnection();
				ptp.activeConnection = true;
				this.parentElement.parentElement.parentElement.remove();
				ui.popupStack--;
			} catch (e) {
				this.parentElement.children[1].innerHTML = "Reconnect " + String(e);
			}
		}

		var btn2 = document.createElement("DIV");
		btn2.innerText = "Help";
		btn2.className = "button";
		content.appendChild(btn2);
		btn2.onclick = function() {
			ui.helpPopup();
		}
	}
};

ui.helpPopup = function() {
	ui.popup(
`<h2>I can't connect to my camera</h2>
<ul>
<li>Try using a different USB cable - yours might be broken</li>
<li>For USB, you will need a micro-usb or USB-C to USB adapter. You can find these on Amazon
for under $5, but you may have one that was included with your phone.</li>
<li>You will need to give CamControl permission to access your camera. Other apps may be taking
control of the camera automatically or before CamControl can. You may need to reset the permissions
on these apps.</li>
</ul>

<h2>It crashes</h2>
<ul>
<li>Well, it appears like I (the programmer) made a mistake somewhere.</li>
` + (backend.isInterv ? "" : "<li>Let me know, and I will make it right. <b>If you bought the app on Google Play, you can refund it within 3 hours.</b></li>") + `
<li>CamControl v0.1.0 only only has support for Canon EOS DSLR cameras, I don't have any other cameras to test with :)</li>
<li>Send me an email at <span class="copy">brikbusters@gmail.com</span> if you need assistance.</li>
</ul>`);
};

ui.tipsPopup = function() {
	ui.popup(
`<h1>Icons & what they mean</h1>`);
};

ui.showMenu = function() {
	var menu = document.createElement("DIV");
	menu.innerHTML =
`
<div class="menu-table">
<div onclick="ui.openScripts()"><img src="icons/puzzle.png"><p>Plugins</p></div>
<div onclick="ui.openProfiles()"><img src="icons/adjustments.png"><p>Camera Profiles</p></div>
<div onclick="ui.openSettings()"><img src="icons/settings.png"><p>Settings</p></div>
<div onclick="ui.openAbout()"><img src="icons/info-circle.png"><p>About</p></div>
</div>
`;
	ui.popup(menu);
};

ui.openAbout = function() {
	ui.popup(
`
<img width="100" src="icons/camcontrol.png">
<p>CamControl v0.1.0</p>
<p>Brought to you by:</p>
<ul>
<li>CamLib, an Open-Source PTP library written by me</li>
<li>The C programming language, and Javascript</li>
<li>Tabler Icons (tabler-icons.io) MIT License</li>
</ul>
<p>Debug log:</p>
<textarea class="textarea">` + ui.logBuffer + `</textarea>
`
	);
};

ui.openScripts = function() {
	var content = document.createElement("DIV");

	content.fill = function() {
		this.innerHTML = "";
		var btn = document.createElement("DIV");
		btn.innerHTML = "Install plugins";
		btn.className = "button";
		this.appendChild(btn);
		btn.onclick = function() {
			ui.openScriptEditor(this.parentElement);
		}

		var p = document.createElement("P");
		p.innerText = "Currently running tasks:";
		this.appendChild(p);

		for (var i = 0; i < tasks.length; i++) {
			var tsk = document.createElement("DIV");
			tsk.className = "script-task";
			tsk.innerText = tasks[i].name + " (" + tasks[i].fps + "fps)";
			if (tasks[i].error) { tsk.style.background = "lightcoral"; }
			if (tasks[i].name == "ev" || tasks[i].name == "core") {
				tsk.innerText += " - CamControl internal task";
				if (tasks[i].error) tsk.innerText += " (dead)";
			}

			this.appendChild(tsk);
		}

		if (tasks.length == 0) {
			p.innerText = "No tasks currently running.";
		}

		var p = document.createElement("P");
		p.innerText = "Installed plugins:";
		this.appendChild(p);

		for (var i = 0; i < currentSettings.scripts.length; i++) {
			var tsk = document.createElement("DIV");

			var span = document.createElement("SPAN");
			tsk.className = "script-task";
			span.innerText = currentSettings.scripts[i].name;

			var settings = document.createElement("DIV");
			settings.className = "task-icon";
			settings.innerHTML = "<img width='20' src='icons/settingsb.png'>";
			settings.it = i;
			settings.onclick = function() {
				ui.openScriptEditor(content, this.it);
			}

			tsk.appendChild(span);
			tsk.appendChild(settings);
			this.appendChild(tsk);
		}

		if (currentSettings.scripts.length == 0) {
			p.innerText = "No plugins currently installed.";
		}
	}

	content.fill.call(content);

	ui.popup(content);
};

ui.openScriptEditor = function(parent, existing) {
	var content = document.createElement("DIV");

	var ta = document.createElement("TEXTAREA");
	if (existing == undefined) {
	ta.value =
`{
    name: "demo",
    init: async function() {
        var r = await ptp.getDeviceInfo();
        ptp.toast(r.resp.device_version);
    }
}`;
	} else {
		ta.value = currentSettings.scripts[existing].text;
	}

	ta.className = "textarea";
	ta.spellcheck = false;
	content.appendChild(ta);

	if (existing == undefined) {
		var btn = document.createElement("DIV");
		btn.innerText = "Add script";
		btn.className = "button";
		content.appendChild(btn);
		btn.parent = parent;
		btn.onclick = function() {
			var ta = this.parentElement.getElementsByClassName("textarea")[0];
			saveScript(ta.value);
			this.parent.fill.call(this.parent);
			closeThis(this);
		};
	} else {
		ta.onchange = function() {
			currentSettings.scripts[existing].text = this.value;
		}

		var btn = document.createElement("DIV");
		btn.innerText = "Delete script";
		btn.className = "button red";
		content.appendChild(btn);
		btn.parent = parent;
		btn.onclick = function() {
			var ta = this.parentElement.getElementsByClassName("textarea")[0];
			currentSettings.scripts.splice(existing, 1);
			this.parent.fill.call(this.parent);
			closeThis(this);
		};
	}

	var btn2 = document.createElement("DIV");
	btn2.innerText = "Run now";
	btn2.className = "button go";
	content.appendChild(btn2);
	btn2.onclick = async function() {
		var ta = this.parentElement.getElementsByClassName("textarea")[0];
		this.parentElement.getElementsByClassName("status")[0].innerText = await runScript(ta.value);
	};

	var p = document.createElement("P");
	p.className = "status";
	content.appendChild(p);

	ui.popup(content);
};

ui.openProfiles = function() {
	var content = document.createElement("DIV");

	content.fill = function() {
		this.innerHTML = "";

		var btn = document.createElement("DIV");
		btn.innerText = "New Profile";
		btn.className = "button";
		content.appendChild(btn);
		btn.onclick = function() {
			var model = "My Camera";
			var serial = "123456";
			var name = "My Profile";
			if (ptp.info) {
				model = ptp.model;
				serial = ptp.serial_number;
			}

			newProfile(model, serial, name);
			this.parentElement.fill.call(content);
		}
		
		var p = document.createElement("P");
		p.innerText = "A 'profile' can hold different settings for each camera, or each shooting workflow.";
		this.appendChild(p);
	
		for (var i = 0; i < currentSettings.profiles.length; i++) {
			var tsk = document.createElement("DIV");
			tsk.className = "script-task";
			tsk.style.background = "lightred";

			var span = document.createElement("SPAN");
			tsk.className = "script-task";
			span.innerText = currentSettings.profiles[i].name;

			var settings = document.createElement("DIV");
			settings.className = "task-icon";
			settings.innerHTML = "<img width='20' src='icons/settingsb.png'>";
			settings.it = i;
			settings.onclick = function() {
				ui.openProfileViewer(content, this.it);
			}

			tsk.appendChild(span);
			tsk.appendChild(settings);

			this.appendChild(tsk);
		}
	
		if (currentSettings.profiles.length == 0) {
			var p = document.createElement("P");
			p.innerText = "No profiles created.";
			this.appendChild(p);
		}
	}

	content.fill.call(content);
	
	ui.popup(content);
};

ui.openProfileViewer = function(parent, index) {
	// TODO: Edited profile should show up when popup is closed

	var content = document.createElement("DIV");

	var btn = document.createElement("DIV");
	btn.innerText = "Apply profile";
	btn.className = "button";
	content.appendChild(btn);
	btn.parent = parent;
	btn.onclick = function() {
		ptp.runProfile(currentSettings.profiles[index]);
		closeThis(this);
	};

	var span = document.createElement("SPAN");
	span.innerText = "Name: ";
	content.appendChild(span);

	var ta = document.createElement("INPUT");
	ta.type = "text";
	ta.value = currentSettings.profiles[index].name;

	ta.spellcheck = false;
	ta.autocapitalize = false;
	content.appendChild(ta);

	ta.onchange = function() {
		currentSettings.profiles[index].name = this.value;
	}

	var btn = document.createElement("DIV");
	btn.innerText = "Delete profile";
	btn.className = "button red";
	content.appendChild(btn);
	btn.parent = parent;
	btn.onclick = function() {
		currentSettings.profiles.splice(index, 1);
		this.parent.fill.call(this.parent);
		closeThis(this);
	};

	var p = document.createElement("p");
	var keys = Object.keys(currentSettings.profiles[index]);
	var values = Object.values(currentSettings.profiles[index]);
	var s = "<b>Profile state:</b><br>";
	for (var i = 0; i < keys.length; i++) {
		s += keys[i] + ": " + values[i] + "<br>";
	}
	p.innerHTML = s;
	content.appendChild(p);

	ui.popup(content);
};

ui.openSettings = function() {
	var profMsg = "<p>You are currently not modifying a profile.</p>";
	if (currentProfile != null) {
		profMsg = "<p>Currently modifying profile '" + currentProfile.name + "'</p>"
	}

	if (backend.isAndroid) {
		profMsg += `
<p>Save Directory
<select set="directory">
<option value="camera">DCIM/Camera</option>
<option value="default">DCIM/CamControl (default)</option>
</select>
<br><i>Where to save captured and downloaded images</i></p>
`;
	} else {
		profMsg += `
<p>Save Directory
<select set="directory">
<option value="default">This directory (default)</option>
</select>
<br><i>Where to save captured and downloaded images</i></p>
`;
	}

	profMsg += 
`
<p>Focus Precision<input set="focusPrecision" type="range" min="1" max="3"><val>0</val></p>

<p>Wait after connection<input set="waitForMagicLantern" type="range" min="0" max="3"><val>0</val>
<br><i>Waits X seconds after connecting (to allow Magic Lantern modules to load)</i></p>

<p>Render Limiter<input set="renderCeiling" type="range" min="40" max="100"><val>0</val>
<br><i>Allows liveview renders to be delayed, while processing.</i></p>
`;

	var content = document.createElement("DIV");
	content.className = "settings-popup";
	content.innerHTML = profMsg;

	var inp = content.getElementsByTagName("INPUT");
	for (var i = 0; i < inp.length; i++) {
		inp[i].value = getSetting(inp[i].getAttribute("set"));
		inp[i].nextElementSibling.innerText = inp[i].value;
		inp[i].oninput = function() {
			this.nextElementSibling.innerText = this.value;
			changeSetting(this.getAttribute("set"), Number(this.value));
		}
	}

	var sel = content.getElementsByTagName("SELECT");
	for (var i = 0; i < sel.length; i++) {
		sel[i].value = getSetting(sel[i].getAttribute("set"));
		sel[i].oninput = function() {
			changeSetting(this.getAttribute("set"), this.value);
		}		
	}

	ui.popup(content);
};

ui.openISOSelector = function() {
	var c = document.createElement("DIV");

	var v = [0, 100, 200, 400, 800, 1600, 3200, 6400, 12800];

	for (var i = 0; i < v.length; i++) {
		var d = document.createElement("DIV");
		d.className = "number-selector";
		d.dataValue = v[i];
		d.innerText = genISO(v[i]);
		c.appendChild(d);
		d.onclick = async function() {
			if (!ptp.activeConnection || !ptp.ready) return;
			await ptp.setProperty("iso", this.dataValue);
			closeThis(this);
		}
	}

	ui.popupShort(c);
};

ui.openShutterSelector = function() {
	var content = document.createElement("DIV");

	var slider = document.createElement("INPUT");
	slider.className = "full-slider";
	slider.type = "range";
	slider.oninput = function() {
		var v = validShutterSpeeds();
		slider.min = 0;
		slider.max = v.length - 1;
		this.nextElementSibling.innerText = genShutter(v[this.value]);
	}

	content.appendChild(slider);
	var p = document.createElement("P");
	content.appendChild(p);

	slider.value = 0;
	if (getSetting("shutter speed") != null) {
		slider.value = validShutterSpeeds().indexOf(getSetting("shutter speed"));
	}
	
	slider.oninput.call(slider);

	var btn = document.createElement("DIV");
	btn.innerText = "Apply";
	btn.className = "button";
	content.appendChild(btn);
	btn.onclick = async function() {
		if (!ptp.activeConnection || !ptp.ready) return;
		var value = Number(this.parentElement.getElementsByClassName("full-slider")[0].value);
		await ptp.setProperty("shutter speed", validShutterSpeeds()[value]);
		closeThis(this);
	}

	ui.popupShort(content);
};

ui.openApertureSelector = function() {
	var content = document.createElement("DIV");

	var slider = document.createElement("INPUT");
	slider.className = "full-slider";
	slider.type = "range";
	slider.oninput = function() {
		var v = validApertures();
		slider.min = 0;
		slider.max = v.length - 1;
		this.nextElementSibling.innerText = genAperture(v[this.value]);
	}

	content.appendChild(slider);
	var p = document.createElement("P");
	content.appendChild(p);

	slider.value = 0;
	if (getSetting("aperture") != null) {
		slider.value = validApertures().indexOf(getSetting("aperture"));
	}
	
	slider.oninput.call(slider);

	var btn = document.createElement("DIV");
	btn.innerText = "Apply";
	btn.className = "button";
	content.appendChild(btn);
	btn.onclick = async function() {
		if (!ptp.activeConnection || !ptp.ready) return;
		var value = Number(this.parentElement.getElementsByClassName("full-slider")[0].value);
		await ptp.setProperty("aperture", validApertures()[value]);
		closeThis(this);
	}

	ui.popupShort(content);
};

ui.openFormatSelector = function() {
	var c = document.createElement("DIV");

	var v = [1, 2, 3, 4];

	for (var i = 0; i < v.length; i++) {
		var d = document.createElement("DIV");
		d.className = "number-selector";
		d.dataValue = v[i];
		d.innerText = genFormat(v[i]);
		c.appendChild(d);
		d.onclick = async function() {
			if (!ptp.activeConnection || !ptp.ready) return;
			await ptp.setProperty("image format", this.dataValue);
			closeThis(this);
		}
	}

	ui.popupShort(c);
};

ui.openWhiteBalanceSelector = function() {
	var c = document.createElement("DIV");

	var v = [0, 1, 2, 3, 4];

	for (var i = 0; i < v.length; i++) {
		var d = document.createElement("DIV");
		d.className = "number-selector";
		d.dataValue = v[i];
		d.innerText = genWhiteBalance(i);
		c.appendChild(d);
		d.onclick = async function() {
			if (!ptp.activeConnection || !ptp.ready) return;
			await ptp.setProperty("white balance", this.dataValue);
			closeThis(this);
		}
	}

	ui.popupShort(c);
};

ui.viewLastFile = async function() {
	if (ui.lastObjectHandle == 0) return;

	if (!ptp.activeConnection || !ptp.ready) return;

	var info = ptp.getObjectInfo(ui.lastObjectHandle);
	console.log("New object", info);

	var c = document.createElement("DIV");
	var img = document.createElement("IMG");
	var thumb = await ptp.getThumbnail(ui.lastObjectHandle);
	img.src = createJpegFromArray(thumb.jpeg);
	c.appendChild(img);

	var btn = document.createElement("DIV");
	btn.innerText = "Download to " + backend.getDirectory();
	btn.className = "button";
	c.appendChild(btn);
	btn.onclick = async function() {
		var filename = newImageName();
		ptp.toast("Downloading to " + filename);
		await ptp.downloadFile(filename, ui.lastObjectHandle);
		ptp.toast("Completed downloading.");
	}

	ui.popup(c);
};

