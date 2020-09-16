import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getAudioContext } from '../audio/audio.js';
import addWindowResizeCallback from './windowresize.js';

// maximum recording length is 4 seconds
const recBufferMaxLength = 44100 * 4;
let canvasEl, canvasRect, canvasCtx, recordArmEl, recordMeterEl;
let analyser, source, stream, bufferLength, dataArray, recorderWorkletNode, recBuffer, recIndex;

/**
 * Add event listeners.
 */
function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
  recordArmEl.addEventListener('change', e => {
    dispatch(getActions().toggleRecordArm());
  });
  addWindowResizeCallback(handleWindowResize);
}

/**
 * Draw an oscilloscope of the current audio source.
 */
function draw() {
  analyser.getByteTimeDomainData(dataArray);
  const sliceWidth = canvasRect.width / bufferLength;
  let x = 0;

  canvasCtx.fillRect(0, 0, canvasRect.width, canvasRect.height);
  canvasCtx.beginPath();
  for(let i = 0; i < bufferLength; i++) {
    const value = dataArray[i] / 128;
    const y = value * canvasRect.height / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvasRect.width, canvasRect.height / 2);
  canvasCtx.stroke();

  if (source) {
    requestAnimationFrame(draw);
  } else {
    canvasCtx.fillRect(0, 0, canvasRect.width, canvasRect.height);
  }
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
 * Window resize event handler.
 */
function handleWindowResize() {
	updateCanvas();
}

/**
 * General module setup.
 */
export function setup() {
  recordArmEl = document.querySelector('#controls__record-arm');
  recordMeterEl = document.querySelector('#controls__record-meter');
  recBuffer = new Array(recBufferMaxLength);
  recBuffer.fill(0);
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
      recBuffer.splice(recIndex, e.data.length, ...e.data);
      recIndex += e.data.length;

      // convert Array to Float32Array
      var float32Array = new Float32Array(recBuffer);

      // ArrayBuffer to String
      const uint8Array = new Uint8Array(float32Array.buffer);
      let binaryStr = '';
      for (let i = 0, n = uint8Array.byteLength; i < n; i++) {
        binaryStr += String.fromCharCode(uint8Array[i]);
      }

      dispatch(getActions().recordAudioStream(binaryStr));
      
      if (recIndex >= recBufferMaxLength) {
        recBuffer.length = recBufferMaxLength;
        dispatch(getActions().toggleRecording(false));
      }
    };
    source.connect(recorderWorkletNode);
  }).catch(error => {
    console.log(error);
  });
}

/**
 * Create the record meter the first time it is requested. 
 */
function setupMeter() {
  if (analyser) {
    return;
  }

  canvasEl = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
  recordMeterEl.appendChild(canvasEl);
  canvasCtx = canvasEl.getContext('2d');
  updateCanvas();
	
  analyser = getAudioContext().createAnalyser();
  analyser.fftSize = 2048;
  bufferLength = analyser.fftSize;
  dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);
}

function updateCanvas() {
  canvasEl.height = recordMeterEl.clientHeight;
  canvasEl.width = recordMeterEl.clientWidth;
  canvasRect = canvasEl.getBoundingClientRect();
  canvasCtx.fillStyle = 'rgb(255, 255, 255)';
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
}

/**
 * Open audio stream.
 * Stackoverflow: Web Audio API creating a Peak Meter with AnalyserNode
 * @see https://stackoverflow.com/a/44360625
 * @param {Object} state Application state.
 */
async function updateRecordArm(state) {
  const { isRecordArmed } = state;

  // set the checkbox
  recordArmEl.checked = isRecordArmed;

  // create an audiostream source and show analyser
	if (isRecordArmed) {
		try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setupMeter();
      source = getAudioContext().createMediaStreamSource(stream);
      source.connect(analyser);
      setupAudioWorklet();
      draw();
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
    recIndex = 0;
    recBuffer.fill(0);
    recorderWorkletNode.port.postMessage('startRecording');
  } else {
    recorderWorkletNode.port.postMessage('stopRecording');
  }
}
