import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { lowestOctave, numOctaves, pitches, sampleRate } from '../utils/utils.js';

const NOTE_ON = 144;
const NOTE_OFF = 128;
const numVoices = 84;
const pitchRange = new Array(127).fill(null);
const voices = [];
const noteDuration = 0.5;
const buffers = [null, null, null, null, null, null, null, null];
let audioCtx;
let voiceIndex = 0;

/**
 * Create the bank of reusable voice objects.
 */
function createVoices() {
	for (let i = 0; i < numVoices; i++) {
		const gain = audioCtx.createGain();
		gain.connect(audioCtx.destination);

		voices.push({
			isPlaying: false,
			gain,
			source: null,
			timerId: null,
		});
	}
}

/**
 * Provide the AudioContext.
 * @returns {Object} AudioContext.
 */
export function getAudioContext() {
	return audioCtx;
}

/**
 * Provide an audiobuffer.
 * @returns {Object} AudioBuffer.
 */
export function getBuffer(index) {
  return buffers[index] ? buffers[index].buffer : null;
}

/**
 * Handle MIDI message.
 * @param {Object} state Application state.
 */
function handleMIDI(state) {
	const {data0, data1, data2 } = state;
	switch (data0) {
		case NOTE_ON:
			startNote(0, data1, data2);
			break;
		
		case NOTE_OFF:
			stopNote(0, data1, data2);
			break;
		
		default:
			console.log('unhandled MIDI data: ', data0, data1, data2);
	}
}

/**
 * App state changed.
 * @param {Event} e Custom event.
 */
function handleStateChanges(e) {
	const { state, action, actions, } = e.detail;
	switch (action.type) {

		case actions.LOAD_AUDIOFILE:
		case actions.RECORD_AUDIOSTREAM:
			updateAudioBuffers(state);
			break;

		case actions.PLAY_NOTE:
			playNote(state);
			break;

		case actions.TOGGLE_SETTINGS:
			initialiseAudio(state);
			break;
	}
}

/**
 * Audio initialised after user generated event.
 * In this case a click on the Bluetooth connect button.
 * @param {Object} state Application state.
 */
function initialiseAudio(state) {
	const { isSettingsVisible } = state;
	if (!audioCtx && !isSettingsVisible) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate, });
		createVoices();
		updateAudioBuffers(state);
	}
}

/**
 * Converts a MIDI pitch number to frequency.
 * @param  {Number} midi MIDI pitch (0 ~ 127)
 * @return {Number} Frequency (Hz)
 */
function mtof(midi) {
	if (midi <= -1500) return 0;
	else if (midi > 1499) return 3.282417553401589e+38;
	else return 440 * Math.pow(2, (Math.floor(midi) - 69) / 12);
};

/**
 * Play a note.
 * @param {Object} state Application state.
 */
function playNote(state) {
	const { note, pads } = state;
	const { command, index, velocity } = note;
	if (audioCtx && command === NOTE_ON && velocity !== 0) {
		if (pads[index]) {
			const { startOffset } = pads[index];
			startOneShot(0, index, velocity, startOffset);
		}
	}
}

/**
 * Play a sound of fixed length.
 * @param {Number} nowToStartInSecs 
 * @param {Number} index Pad index. 
 * @param {Number} velocity 
 * @param {Number} startOffset 
 */
function startOneShot(nowToStartInSecs, index, velocity, startOffset = 0) {
	if (!buffers[index]) {
		return;
	}

	const buffer = buffers[index].buffer;
	const voice = voices[voiceIndex];
	voiceIndex = ++voiceIndex % numVoices;

	const pitch = pitches[index];
	stopOneShot(pitch);
	
	const gainLevel = velocity**2 / 127**2;
	const startTime = audioCtx.currentTime + nowToStartInSecs;
	voice.isPlaying = true;

	voice.source = audioCtx.createBufferSource();
  voice.source.buffer = buffer;
	voice.source.connect(voice.gain);
	voice.source.start(startTime, startOffset / buffer.sampleRate);
	voice.gain.gain.setValueAtTime(gainLevel, startTime);

  voice.source.onended = function(e) {
		if (pitchRange[pitch] && voice.isPlaying) {
			stopOneShot(pitch);
		}
  };

	pitchRange[pitch] = voice;
}

/**
 * Stop sound playback and free the voice for reuse.
 * @param {Object} voice
 */
function stopOneShot(pitch) {
	if (pitchRange[pitch]) {
		pitchRange[pitch].isPlaying = false;
		pitchRange[pitch].source.stop(audioCtx.currentTime);
		pitchRange[pitch].source.disconnect();
		pitchRange[pitch] = null;
	}
}

/**
 * Setup at app start.
 */
export function setup() {
	document.addEventListener(STATE_CHANGE, handleStateChanges);
}

/**
 * Play a sound of until note off.
 * @param {Number} nowToStartInSecs 
 * @param {Number} index Pad index. 
 * @param {Number} velocity 
 * @param {Number} duration 
 */
function startNote(nowToStartInSecs, index, pitch, velocity, startOffset = 0) {
	if (!buffers[index]) {
		return;
	}
	
	stopNote(0, pitch, velocity);

	const buffer = buffers[index].buffer;

	const voice = voices[voiceIndex];
	voiceIndex = ++voiceIndex % numVoices;

	
	const gainLevel = velocity**2 / 127**2;
	const startTime = audioCtx.currentTime + nowToStartInSecs;
	voice.isPlaying = true;

	voice.source = audioCtx.createBufferSource();
  voice.source.buffer = buffer;
	voice.source.connect(voice.gain);
	voice.source.start(startTime, startOffset / buffer.sampleRate);
	voice.gain.gain.setValueAtTime(gainLevel, startTime);

  voice.source.onended = function(e) {
    stopNote(0, pitch, velocity);
  };

	pitchRange[pitch] = voice;
}

/**
 * Stop sound playback and free the voice for reuse.
 * @param {Object} voice
 */
function stopNote(nowToStopInSecs, pitch, velocity) {
	if (pitchRange[pitch]) {
		pitchRange[pitch].source.stop(audioCtx.currentTime + nowToStopInSecs);
		pitchRange[pitch].source.disconnect();
		pitchRange[pitch].isPlaying = false;
		pitchRange[pitch] = null;
	}
}

/**
 * 
 * @param {Object} state Application state.
 */
function updateAudioBuffers(state) {
	const { isRecording, pads } = state;
	pads.map((pad, index) => {
		if (pad) {
			const { buffer: bufferStr, name } = pad;
			if (!buffers[index] || buffers[index].name !== name || isRecording) {

				// convert String to ArrayBuffer
				const arrayBuffer = new ArrayBuffer(bufferStr.length);
				const dataView = new DataView(arrayBuffer);
				for (let i = 0, n = arrayBuffer.byteLength; i < n; i++) {
					dataView.setUint8(i, bufferStr.charCodeAt(i));
				}

				// convert ArrayBuffer to AudioBuffer
				const int16Array = new Int16Array(arrayBuffer);
				const channels = 1;
				const audioBuffer = audioCtx.createBuffer(channels, int16Array.length, audioCtx.sampleRate);
				const audioBufferChannel = audioBuffer.getChannelData(0);
				for (let i = 0, n = int16Array.length; i < n; i++) {
					audioBufferChannel[i] = int16Array[i] / 0xFFFF;
				}
				buffers[index] = { name, buffer: audioBuffer, };

				// get maximum amplitude, for normalizing
				const channelData = audioBuffer.getChannelData(0);
				let maxAmplitude = 0;
				for (let i = 0, n = channelData.length; i < n; i++) {
					maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
				}

				dispatch({ type: getActions().AUDIOFILE_DECODED, index, maxAmplitude, numSamples: audioBuffer.length, });
			}
		}
	});
}
