import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getAudioContext } from './audio.js';
import { sampleRate } from '../utils/utils.js';

// maximum recording length is 4 seconds
const recBufferMaxLength = sampleRate * 4;
const maxSilenceDuration = sampleRate * 1;
const inputLevelTreshold = 0.2;

let analyser, bufferLength, dataArray, recBuffer, recBufferIndex, recorderWorkletNode, source, silenceDuration = 0, stream;

/**
 * Add event listeners.
 */
function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
}

/**
 * Capture audio recorded by the RecorderWorkletProcessor.
 * @param {Object} e Event sent from AudioWorkletProcessor.
 */
function captureAudio(e) {

  // convert Array of Numbers from -1 to 1 and add to Int16Array
  const recBufferLastIndex = Math.min(recBufferIndex + e.data.length, recBufferMaxLength);
  for (let j = 0; recBufferIndex < recBufferLastIndex; recBufferIndex++, j++) {
    const sample = Math.max(-1, Math.min(e.data[j], 1));
    recBuffer[recBufferIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;

    // measure silence duration
    if (Math.abs(sample) < inputLevelTreshold) {
      silenceDuration++;
    } else {
      silenceDuration = 0;
    }
  }

  // ArrayBuffer to String
  const uint8Array = new Uint8Array(recBuffer.buffer);
  let binaryStr = '';
  for (let i = 0, n = uint8Array.byteLength; i < n; i++) {
    binaryStr += String.fromCharCode(uint8Array[i]);
  }

  dispatch(getActions().recordAudioStream(binaryStr));
  
  if (recBufferIndex >= recBufferMaxLength || silenceDuration >= maxSilenceDuration) {
    dispatch(getActions().toggleRecording(false));
  }
}


export function getAnalyserData() {
  if (analyser) {
    analyser.getByteTimeDomainData(dataArray);
  }
  return { dataArray, bufferLength };
}

/**
 * Application state changed.
 * @param {Object} e Custom event.
 */
function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {
      
    case actions.SET_PROJECT:
    case actions.TOGGLE_RECORD_ARM:
			updateRecordArm(state);
      break;
    
    case actions.TOGGLE_RECORDING:
      updateRecording(state);
      break;
  }
}

/**
 * General module setup.
 */
export function setup() {
  recBuffer = new Int16Array(recBufferMaxLength);
  addEventListeners();
}

function setupAudioWorklet() {
  if (recorderWorkletNode) {
    source.connect(recorderWorkletNode);
    return;
  }

  const audioCtx = getAudioContext();
  audioCtx.audioWorklet.addModule('js/audio/recorder-worklet-processor.js').then(() => {
    recorderWorkletNode = new AudioWorkletNode(audioCtx, 'recorder-worklet-processor');
    recorderWorkletNode.port.onmessage = e => {
      switch (e.data) {

        case 'startCapturing':
          dispatch(getActions().recordStart());
          break;

        default:
          captureAudio(e);
      }
    };
    source.connect(recorderWorkletNode);
  }).catch(error => {
    console.log(error);
  });
}

/**
 * Open audio stream.
 * Stackoverflow: Web Audio API creating a Peak Meter with AnalyserNode
 * @see https://stackoverflow.com/a/44360625
 * @param {Object} state Application state.
 */
async function updateRecordArm(state) {
  const { isRecordArmed } = state;
  const ctx = getAudioContext();

  if (isRecordArmed) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      bufferLength = analyser.fftSize;
      dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      setupAudioWorklet();
    } catch(error) {
      console.log('Record arm error: ', error);
      dispatch(getActions().toggleRecordArm());
    }
  } else {

    // disconnect source and close stream
    if (source) {
      source.disconnect(analyser);
      source.disconnect(recorderWorkletNode);
      source = null;
    }
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
    }
  }
}

/**
 * Toggle recording.
 * @param {Object} state Application state.
 */
function updateRecording(state) {
  const { isRecording } = state;
  if (isRecording) {
    recorderWorkletNode.port.postMessage('stopRecording');
    recBufferIndex = 0;
    recBuffer = new Int16Array(recBufferMaxLength);
    silenceDuration = 0;

    // a short delay to avoid recording the sound of the shape in the Kibo.
    setTimeout(() => {
      recorderWorkletNode.port.postMessage('startRecording');
    }, 50);
  } else {
    recorderWorkletNode.port.postMessage('stopRecording');
  }
}
