import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getAudioContext } from './audio.js';
import { NUM_SAMPLES, sampleRate } from '../utils/utils.js';
import { showDialog } from '../view/dialog.js';

// maximum recording length is 4 seconds
const FFT_SIZE = 256;
const INPUT_LEVEL_TRESHOLD = 0.2;
const maxSilenceDuration = sampleRate * 1;

let analyser, bufferLength, dataArray, recBuffer, recBufferIndex, recorderWorkletNode, source, 
  silenceDuration = 0, stream;

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
  const currentBufferIndex = recBufferIndex;
  const recBufferLastIndex = Math.min(recBufferIndex + e.data.length, NUM_SAMPLES);
  for (let i = 0, j = recBufferIndex, n = e.data.length; i < n; i++, recBufferIndex++) {
    const sample = Math.max(-1, Math.min(e.data[i], 1));
    recBuffer[recBufferIndex] = sample;

    // measure silence duration
    if (Math.abs(sample) < INPUT_LEVEL_TRESHOLD) {
      silenceDuration++;
    } else {
      silenceDuration = 0;
    }
  }

  dispatch(getActions().recordAudioStream(currentBufferIndex, recBufferLastIndex));
  
  if (recBufferIndex >= NUM_SAMPLES || silenceDuration >= maxSilenceDuration) {
    dispatch(getActions().toggleRecording(false));
  }
}

function clearBuffer() {
  recBuffer = new Array(NUM_SAMPLES);
  recBuffer.fill(0, 0, NUM_SAMPLES);
}


export function getAnalyserData() {
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
  }
  return { dataArray, bufferLength };
}


export function getRecorderBuffer() {
  return recBuffer;
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
  clearBuffer();
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
    recorderWorkletNode.port.postMessage({ sampleRate, });
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
      analyser.fftSize = FFT_SIZE;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -24;
      analyser.smoothingTimeConstant = 0.8;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      setupAudioWorklet();
    } catch(error) {
      showDialog(
        'Microphone not accessible', 
        `Please check the browser's site settings to make sure the use of the microphone is not blocked.`,
        'Ok');
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
  const { isCapturing, isRecording } = state;
  if (isRecording) {
    recorderWorkletNode.port.postMessage('stopRecording');
    recBufferIndex = 0;
    silenceDuration = 0;
    clearBuffer();

    // a short delay to avoid recording the sound of the shape in the Kibo.
    setTimeout(() => {
      recorderWorkletNode.port.postMessage('startRecording');
    }, 50);
  } else {
    recorderWorkletNode.port.postMessage('stopRecording');

    if (isCapturing) {
      
      // convert recording buffer to string
      const recCompleteBuffer = new Int16Array(NUM_SAMPLES); 
      for (let i = 0, n = recBuffer.length; i < n; i++) {
        const sample = recBuffer[i];
        recCompleteBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      // Int16Array's ArrayBuffer to String
      const binaryStr = JSON.stringify(Array.from(new Uint8Array(recCompleteBuffer.buffer)));
      
      // a minimal delay to dispatch after the current action has finished
      setTimeout(() => {
        dispatch(getActions().recordStore(binaryStr));
      }, 0);
    }
  }
}
