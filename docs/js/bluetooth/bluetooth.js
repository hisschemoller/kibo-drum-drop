import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';

const bluetoothServiceUUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
let device, server, service, characteristic;

function addEventListeners() {
	document.addEventListener(STATE_CHANGE, handleStateChanges);
}

/**
 * Bluetooth device scan, connect and subscribe.
 */
async function connect() {
	const options = {
		// acceptAllDevices: true,
		filters: [{
			services: [ bluetoothServiceUUID ],
		}],
	};
	try {
		console.log('requesting bluetooth device...');
		device = await navigator.bluetooth.requestDevice(options);
		device.addEventListener('gattserverdisconnected', e => {
			console.log('bluetooth device disconnected');
			dispatch(getActions().bluetoothDisconnect());
		});
		console.log('> bluetooth device found');
		if (!device.gatt.connected) {
			console.log('> bluetooth device connecting...');
			server = await device.gatt.connect();
			console.log('> bluetooth device connected');
			service = await server.getPrimaryService(bluetoothServiceUUID);
			console.log('> bluetooth service found');
			const characteristics = await service.getCharacteristics();
			console.log('> bluetooth characteristics found: ', characteristics.length);
			characteristic = characteristics[0];
			if (characteristic.properties.notify) {
				console.log('> bluetooth characteristic has notifications');
				await characteristic.startNotifications();
				console.log('> bluetooth subscribed to notifications');
				characteristic.addEventListener('characteristicvaluechanged', onCharacteristicValueChanged);
				dispatch(getActions().bluetoothSuccess());
			}
		}
	} catch (error)  {
		console.log('bluetooth error: ', error);
		dispatch(getActions().bluetoothError());
	}
}

/**
 * App state changed.
 * @param {Event} e Custom event.
 */
function handleStateChanges(e) {
	const { state, action, actions, } = e.detail;
	switch (action.type) {

		case actions.BLUETOOTH_CONNECT:
			connect();
			break;
	}
}

/**
 * 
 * @param {Event} e
 * @param {Object} e.data
 * byte 0: [10xxxxxx] Header bit, reserved bit for future, timestamp high
 * byte 1: [1xxxxxxx] Timestamp low
 * byte 3: [1xxxxxxx] MIDI status
 * byte 4: [0xxxxxxx] MIDI data 0
 * byte 5: [0xxxxxxx] MIDI data 1
 */
function onCharacteristicValueChanged(e) {
	const { value: data } = e.target;
	switch (data.byteLength) {
		case 5:
			dispatch(getActions().playNote(data.getUint8(2) & 0xf0, data.getUint8(2) & 0x0f, data.getUint8(3), data.getUint8(4)));
			break;
		case 4:
			// console.log('knob:', data.getUint8(2) & 0xf0, data.getUint8(2) & 0x0f, data.getUint8(3));
			break;
	} 
}

/**
 * Module setup at app start.
 */
export function setup() {
	addEventListeners();
}
