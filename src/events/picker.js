'use strict';

const { ipcMain, screen } = require('electron');
const robot = require('robotjs');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

let mouseEvent;
let pollTimer;
let lastPos;
let portalUnavailable = false;
let color;
let lastUpdateTime;

module.exports = (storage, browsers) => {
	const { picker, colorpicker } = browsers;
	const windowDestroyDelay = 100;
	const pickerUpdateDelay = 25;
	const pollInterval = 16;

	let closePicker = (newColor) => {
		if (typeof newColor !== 'string') {
			newColor = color;
		}

		const pickerWindow = picker.getWindow();

		if (pickerWindow) {
			cleanupEvents();
			cleanupEventsLinux();
			colorpicker.getWindow().webContents.send('changeColor', newColor);
			colorpicker.getWindow().focus();
			ipcMain.removeListener('closePicker', closePicker);

			// Reset timing for next picker session
			lastUpdateTime = null;

			setTimeout(() => {
				if (pickerWindow && !pickerWindow.isDestroyed()) {
					pickerWindow.destroy();
				}
			}, windowDestroyDelay);
		}
	};

	// Linux: iohook is no longer shipped in the AppImage (optional native dep that
	// fails to build). On Wayland we ask the desktop's own picker through
	// xdg-desktop-portal (X11 tools can't see Wayland windows); on X11 we poll the
	// cursor with robotjs and take clicks from the picker window, which always
	// sits under the cursor.
	const linuxSupport = () => {
		color = storage.get('lastColor');
		ipcMain.on('closePicker', closePicker);

		if (process.env.XDG_SESSION_TYPE === 'wayland' && !portalUnavailable) {
			return portalPick();
		}
		startPolling();
	};

	const startPolling = () => {
		lastPos = null;
		linuxTick();
		pollTimer = setInterval(linuxTick, pollInterval);
		ipcMain.on('pickerClick', pickerClickLinux);
	};

	const portalPick = () => {
		const pickerWindow = picker.getWindow();
		if (pickerWindow) {
			pickerWindow.hide();
		}
		// Passed with -c so it also works when the app is packed in app.asar
		// (an external python3 can't open files inside the archive).
		const helper = fs.readFileSync(path.join(__dirname, 'portal_pick.py'), 'utf8');
		execFile('python3', ['-c', helper], { timeout: 120000 }, (err, stdout) => {
			const hex = String(stdout || '').trim();
			if (!err && /^#[0-9a-f]{6}$/i.test(hex)) {
				return closePicker(hex);
			}
			if (err && (err.code === 1 || err.killed)) {
				return closePicker(); // cancelled (Esc) or timed out
			}
			console.error('xdg-desktop-portal PickColor not available, falling back to X11 picker', err);
			portalUnavailable = true;
			const win = picker.getWindow();
			if (win && !win.isDestroyed()) {
				win.show();
				startPolling();
			}
		});
	};

	const linuxTick = () => {
		const pickerWindow = picker.getWindow();
		if (!pickerWindow || pickerWindow.isDestroyed()) {
			return cleanupEventsLinux();
		}

		const { x, y } = robot.getMousePos();
		if (!lastPos || lastPos.x !== x || lastPos.y !== y) {
			pickerWindow.setPosition(parseInt(x) - 50, parseInt(y) - 50);
			lastPos = { x, y };
		}

		if (!lastUpdateTime || Date.now() - lastUpdateTime > pickerUpdateDelay) {
			const realtime = storage.get('realtime', 'picker');
			const current = `#${robot.getPixelColor(parseInt(x), parseInt(y))}`;
			pickerWindow.webContents.send('updatePicker', current);
			if (realtime) {
				colorpicker.getWindow().webContents.send('previewColor', current);
			}
			lastUpdateTime = Date.now();
		}
	};

	const pickerClickLinux = (event, button) => {
		if (!picker.getWindow()) {
			return;
		}
		if (button !== 0) {
			return closePicker();
		}
		const { x, y } = robot.getMousePos();
		closePicker(`#${robot.getPixelColor(parseInt(x), parseInt(y))}`);
	};

	ipcMain.on('pickerRequested', (event) => {
		if (process.platform !== 'darwin' && process.platform !== 'win32') {
			return linuxSupport();
		}

		if (process.platform === 'darwin') {
			mouseEvent = require('osx-mouse')();
		}

		if (process.platform === 'win32') {
			mouseEvent = require('win-mouse')();
		}
		color = storage.get('lastColor');

		const pos = screen.getCursorScreenPoint();
		picker.getWindow().setPosition(pos.x - 50, pos.y - 50);

		picker
			.getWindow()
			.webContents.send('updatePicker', robot.getPixelColor(pos.x, pos.y));

		picker.getWindow().on('closed', () => mouseEvent.destroy());
		mouseEvent.on('move', mouseMoveEvent);
		mouseEvent.on('left-up', leftClickEvent);
		ipcMain.on('closePicker', closePicker);
		mouseEvent.on('right-up', closePicker);
	});

	const mouseMoveEvent = (x, y) => {
		const positionScreen = screen.getCursorScreenPoint();
		picker
			.getWindow()
			.setPosition(positionScreen.x - 50, positionScreen.y - 50);

		if (!lastUpdateTime || Date.now() - lastUpdateTime > pickerUpdateDelay) {
			let realtime = storage.get('realtime', 'picker');
			let color = `#${robot.getPixelColor(parseInt(x), parseInt(y))}`;
			picker.getWindow().webContents.send('updatePicker', color);
			if (realtime) {
				colorpicker.getWindow().webContents.send('previewColor', color);
			}
			lastUpdateTime = Date.now();
		}
	};

	const leftClickEvent = (x, y) => {
		closePicker(`#${robot.getPixelColor(parseInt(x), parseInt(y))}`);
	};

	const cleanupEvents = () => {
		if (!mouseEvent) return;

		mouseEvent.removeListener('move', mouseMoveEvent);
		mouseEvent.removeListener('left-up', leftClickEvent);
		mouseEvent.removeListener('right-up', closePicker);
	};

	const cleanupEventsLinux = () => {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
		ipcMain.removeListener('pickerClick', pickerClickLinux);
	};
};
