import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getAnalyserData } from '../audio/recorder.js'
import addWindowResizeCallback from './windowresize.js';

let canvasEl, canvasRect, canvasCtx, isArmed = false, recordArmEl, recordMeterEl;

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
  const { dataArray, bufferLength } = getAnalyserData();
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

  if (isArmed) {
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
  addEventListeners();
}

/**
 * Update canvas after window resize.
 */
function updateCanvas() {
  if (canvasEl) {
    canvasEl.height = recordMeterEl.clientHeight;
    canvasEl.width = recordMeterEl.clientWidth;
    canvasRect = canvasEl.getBoundingClientRect();
    canvasCtx.fillStyle = 'rgb(255, 255, 255)';
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  }
}

/**
 * Set the record armed state.
 * Create the record meter the first time it is requested. 
 */
async function updateRecordArm(state) {
  const { isRecordArmed } = state;
  isArmed = isRecordArmed;

  // set the checkbox
  recordArmEl.checked = isArmed;

	if (isArmed) {
    if (!canvasCtx) {
      canvasEl = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      recordMeterEl.appendChild(canvasEl);
      canvasCtx = canvasEl.getContext('2d');
      updateCanvas();
    }
    draw();
	}
}
