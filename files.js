// Copyright CamControl by Daniel Cook brikbusters@gmail.com

var files = {
	name: "files",
	init: async function() {
		this.devinfo = (await ptp.getDeviceInfo()).resp;
		ptp.vendor = (await ptp.getDeviceType()).resp;
		if (ptp.vendor == ptp.devs.EOS) {
			await ptp.EOSSetRemoteMode(1);
			await ptp.EOSSetEventMode(1);
		}

		var props = await ptp.getEvents();
		this.applyProps(props.resp);
	},

	goBack: async function() {
		if (backend.isAndroid) {
			window.location.href = "index.html?android";
		} else {
			window.location.href = "index.html";
		}
	},

	applyProps: function(props) {
		for (var i = 0; i < props.length; i++) {
			var v = props[i][1];
			if (props[i][0] == "battery") {
				if (v > 0 && v <= 4) {
					document.getElementById("ic-bat").src = "icons/battery-" + String(v) + ".png";
				}
			}
		}
	},

	loop: async function() {
		var props = await ptp.getEvents();
		this.applyProps(props.resp);
	},

	filesystem: document.getElementById("filesystem"),

	addMsg: function(message) {
		var tr = document.createElement("TR");
		tr.className = "note";
		var th = document.createElement("TH");
		tr.appendChild(th);
		th.innerText = message;
		this.filesystem.appendChild(tr);
	},

	add: async function(handle) {
		var info = (await ptp.getObjectInfo(handle)).resp;

		var tr = document.createElement("TR");

		tr.setAttribute("handle", handle);

		var th = document.createElement("TH");
		var img = document.createElement("IMG");

		if (info.format == "folder") {
			tr.className = "folder";
			img.src = "icons/folder.png";
			tr.onclick = function() {
				files.buildTree(files.storageHandle, Number(this.getAttribute("handle")));
			}
		} else {
			tr.className = "file";
			img.src = "icons/file.png";
			tr.info = info;
			tr.handle = handle;
			tr.onclick = function() {
				files.fileInfoPopup(info, handle);
			}
		}

		th.appendChild(img);
		tr.appendChild(th);
		for (var i = 0; i < 3; i++) {
			var th = document.createElement("TH");
			console.log(handle);
			th.innerText = [info.filename, ptp.dateLong(info.date_created), "..."][i];
			tr.appendChild(th);
		}

		this.filesystem.appendChild(tr);
	},

	fileInfoPopup: async function(info, handle) {
		var content = document.createElement("DIV");

		try {
			var thumb = await ptp.getThumbnail(handle);
			var img = document.createElement("IMG");
			img.src = createJpegFromArray(thumb.jpeg);
			content.appendChild(img);
		} catch (e) {
			// Doh
		}

		var p = document.createElement("P");
		p.innerHTML =		
`
<p>Date Created: ` + ptp.dateLong(info.date_created) + `<br>
Date Modified: ` + ptp.dateLong(info.date_created) + `<br>
Size: ` + String(info.img_width) + `x` + String(info.img_height) + `<br>
</p>`;
		content.appendChild(p);

	var btn = document.createElement("DIV");
	btn.innerText = "Download to " + backend.getDirectory();
	btn.className = "button";
	btn.objectHandle = handle;
	content.appendChild(btn);
	btn.onclick = async function() {
		var filename = newImageName();
		ptp.toast("Downloading to " + filename);
		var r = await ptp.downloadFile(filename, this.objectHandle);
		if (r.error == RUNTIME_ERR) {
			ptp.toast("Failed to save image.");
		} else {
			ptp.toast("Completed downloading.");
			ui.addShareButton(this, filename);
		}
	}
		ui.popup(content);
	},

	ids: null,
	
	initFS: async function() {
		this.ids = (await ptp.getStorageIDs()).resp;
		if (this.ids.length == 0) {
			this.addMsg("No storage devices on the camera.");
			return;
		} else {
			await this.buildStorageTree();
		}
		// Quicker:
		 // else if (this.ids.length == 1) {
			// this.storageHandle = this.ids[0];
			// await this.buildTree(this.storageHandle, -1);
		// }
	},

	handleStack: [],

	buildStorageTree: async function() {
		files.filesystem.innerHTML = "<tr><th></th><th>Name</th><th>Capacity</th></tr>";
		for (var i = 0; i < files.ids.length; i++) {
			document.getElementById("back").onclick = files.goBack;
			var info = (await ptp.getStorageInfo(files.ids[i])).resp;
			var tr = document.createElement("TR");
			tr.className = "folder";
			var th = document.createElement("TH");
			th.innerHTML = "<img src='icons/device-sd-card.png'>";
			tr.appendChild(th);
			var th = document.createElement("TH");
			th.innerText = info.storage_type;
			tr.appendChild(th);
			var th = document.createElement("TH");
			th.innerText = String(Math.floor(info.max_capacity / 1000000000)) + "GB";
			tr.appendChild(th);
			files.filesystem.appendChild(tr);
			tr.handle = files.ids[i];
			tr.onclick = async function() {
				files.storageHandle = this.handle;
				await files.buildTree(files.storageHandle, -1);
			}
		}
	},

	buildTree: async function(handle, root) {
		this.handleStack.push(root);
		this.currentHandle = handle;
		this.filesystem.innerHTML = "<tr><th></th><th>Name</th><th>Created</th><th>Size</th></tr>";

		var btn = document.getElementById("back");
		if (root != -1) {
			btn.onclick = function() {
				files.handleStack.pop(); // skip current
				var handle = files.handleStack.pop();
				files.buildTree(files.storageHandle, handle);
			}
		} else {
			btn.onclick = files.buildStorageTree;
		}
		var top = (await ptp.getObjectHandles(handle, root)).resp;
		for (var i = 0; i < top.length; i++) {
			if (i > 100) break;
			this.add(top[i]);
		}
	}
};

ui.startConnection = async function() {
	await ptp.reset();
	ptp.activeConnection = true;
	await ptp.openSession();
	ptp.ready = true;
	await startTask(files, 1);
	await files.initFS();
}

initializeSettings();
ptp.initConnect();
//ui.tryConnect();
