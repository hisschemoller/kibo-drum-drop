import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { maxRecordingLength, pitches, sampleRate } from '../utils/utils.js';
import { getRecorderBuffer } from './recorder.js';

const NOTE_ON = 144;
const NOTE_OFF = 128;
const CHANNELS = 1;
const numVoices = 84;
const pitchRange = new Array(127).fill(null);
const voices = [];
const noteDuration = 0.5;
const buffers = [];
let audioCtx;
let voiceIndex = 0;

/**
 * Create Array of objects containing the audioBuffers.
 */
function createAudioBuffers() {
	const recBufferMaxLength = sampleRate * maxRecordingLength;
	for (let i = 0, n = pitches.length; i < n; i++) {
		buffers.push({
			buffer: audioCtx.createBuffer(CHANNELS, recBufferMaxLength, audioCtx.sampleRate),
			isLoaded: false,
			name: '',
		});
	}
}

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
  return buffers[index].isLoaded ? buffers[index].buffer : null;
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

		case actions.HANDLE_MIDI_MESSAGE:
			playNote(state);
			break;

		case actions.LOAD_AUDIOFILE:
			updateAudioBuffers(state);
			break;
		
		case actions.RECORD_AUDIOSTREAM:
			updateRecordingAudioBuffer(state);
			break;

		case actions.RECORD_START:
			recordStart(state);
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
		createAudioBuffers();
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
 * 
 * @param {Object} state Application state.
 */
function recordStart(state) {
	const { pads, recordingIndex } = state;
	const { name } = pads[recordingIndex];
	buffers[recordingIndex].name = name;
	buffers[recordingIndex].isLoaded = true;
	buffers[recordingIndex].buffer.getChannelData(0).fill(0);
}

/**
 * Play a sound of fixed length.
 * @param {Number} nowToStartInSecs 
 * @param {Number} index Pad index. 
 * @param {Number} velocity 
 * @param {Number} startOffset 
 */
function startOneShot(nowToStartInSecs, index, velocity, startOffset = 0) {
	if (!buffers[index].isLoaded) {
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
	if (!buffers[index].isLoaded) {
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
	const { isRecording, pads, recordingIndex } = state;
	pads.map((pad, index) => {
		if (pad) {
			const { buffer: bufferStr, name } = pad;
			const isEmptyPad = !buffers[index].isLoaded;
			const isOverwritingPad = buffers[index].isLoaded && buffers[index].name !== name;
			const isRecordingToPad = isRecording && index === recordingIndex;
			if (isEmptyPad || isOverwritingPad || isRecordingToPad) {

				// convert String to ArrayBuffer
				const arrayBuffer = new Uint8Array(JSON.parse(bufferStr)).buffer;

				// convert ArrayBuffer to AudioBuffer
				const int16Array = new Int16Array(arrayBuffer);
				const audioBuffer = audioCtx.createBuffer(CHANNELS, int16Array.length, audioCtx.sampleRate);
				const audioBufferChannel = audioBuffer.getChannelData(0);
				for (let i = 0, n = int16Array.length; i < n; i++) {
					audioBufferChannel[i] = int16Array[i] / 0x8000;
				}
				buffers[index] = { buffer: audioBuffer, isLoaded: true, name, };

				dispatch({ type: getActions().AUDIOFILE_DECODED, index, });
			}
		}
	});
}

/**
 * Repeatedly called while recording audio.
 * @param {Object} state Application state.
 */
function updateRecordingAudioBuffer(state) {
	const { captureFirstIndex, captureLastIndex, recordingIndex } = state;
	const recordingBuffer = getRecorderBuffer();
	const audioBufferChannel = buffers[recordingIndex].buffer.getChannelData(0);
	for (let i = captureFirstIndex, n = captureLastIndex; i < n; i++) {
		audioBufferChannel[i] = recordingBuffer[i];
	}

	dispatch({ 
		type: getActions().AUDIORECORDING_DECODED,
		index: recordingIndex,
	});
}
