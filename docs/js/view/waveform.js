import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getBuffer } from '../audio/audio.js';
import addWindowResizeCallback from './windowresize.js';
import { NUM_SAMPLES } from '../utils/utils.js';

const padding = 10;
const fillColor = '#eee';
const strokeColor = '#999';
const backgroundColorCapture = '#333';
const fillColorCapture = '#fff';
const strokeColorCapture = '#fff';
const cache = [];
const firstSample = 0;
let rootEl,
  canvasEl,
  canvasRect,
  ctx,
  channelData, 
  numBlocks, 
  blockSize,
  cacheIndex,
  amplitude;

/**
 * Event listeners.
 */
function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
  addWindowResizeCallback(handleWindowResize);
}

/**
 * Add to existing waveform graphic while recording chunks of audio.
 * @param {Number} captureFirstIndex First sample in recorded audio chunk.
 * @param {Number} captureLastIndex Last sample in recorded audio chunk.
 */
function addToWaveformFilled(captureFirstIndex, captureLastIndex) {
  const firstBlockCapured = Math.ceil((captureFirstIndex / NUM_SAMPLES) * numBlocks);
  const LastBlockCapured = Math.ceil((captureLastIndex / NUM_SAMPLES) * numBlocks);
  const numBlocksCaptured = LastBlockCapured - firstBlockCapured;
  const { blocksNeg, blocksPos } = getWaveformFilledData(firstBlockCapured, LastBlockCapured);

  // zero line 
  // ctx.strokeStyle = strokeColor;
  // ctx.moveTo(0, amplitude);
  // ctx.lineTo(numBlocks, amplitude);
  // ctx.stroke();

  // capture background
  ctx.fillStyle = backgroundColorCapture;
  ctx.fillRect(firstBlockCapured, 0, numBlocksCaptured, canvasRect.height);

  // capture graph
  ctx.save();
  ctx.translate(0, amplitude);
  ctx.fillStyle = fillColorCapture;
  ctx.strokeStyle = strokeColorCapture;
  ctx.beginPath();
  ctx.moveTo(firstBlockCapured, 0);
  for (let i = 0, n = numBlocksCaptured; i < n; i++) {
    ctx.lineTo(firstBlockCapured + i, blocksPos[i] * (amplitude - padding));
  }
  for (let i = numBlocksCaptured - 1, n = 0; i >= n; i--) {
    ctx.lineTo(firstBlockCapured + i, blocksNeg[i] * (amplitude - padding));
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw new segment of audio while recording.
 * @param {Object} state Application state.
 */
function addToRecording(state) {
  const { captureFirstIndex, captureLastIndex } = state;
  channelData = getBuffer(cacheIndex).getChannelData(0);
  addToWaveformFilled(captureFirstIndex, captureLastIndex);
}

/**
 * Clear the waveform canvas.
 */
function clearWaveform() {
  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
}

/**
 * Draw waveform or used cached image.
 */
function drawWaveform() {
  if (cache[cacheIndex]) {
    ctx.putImageData(cache[cacheIndex], 0, 0);
  } else {
    if (!channelData) {
      return;
    }

    drawWaveformFilled();
    cache[cacheIndex] = ctx.getImageData(0, 0, canvasRect.width, canvasRect.height);
  }
}

/**
 * Draw waveform as a filled shape. Best for long samples.
 */
function drawWaveformFilled() {
  const { blocksNeg, blocksPos } = getWaveformFilledData(0, numBlocks);

  // draw
  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  ctx.save();
  ctx.translate(0, amplitude);
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  blocksPos.forEach((value, index) => {
    ctx.lineTo(index, value * (amplitude - padding));
  });
  for (let i = blocksNeg.length - 1; i >= 0; i--) {
    ctx.lineTo(i, blocksNeg[i] * (amplitude - padding));
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Calculate the waveform graph data.
 * @returns {Object} Contains arrays of negative and positive line segments data.
 */
function getWaveformFilledData(firstBlock, lastBlock) {
  const blocksNeg = [];
  const blocksPos = [];

  // collect data
  for (let i = firstBlock; i < lastBlock; i++) {
    const blockFirstSample = firstSample + (blockSize * i);
    const blockFirstSampleCeil = Math.ceil(blockFirstSample);
    const blockLastSample = blockFirstSample + blockSize;
    const blockLastSampleFloor = Math.floor(blockLastSample);
    let blockNegMax = 0;
    let blockPosMax = 0;

    // interpolate first sample
    if (blockFirstSample < blockFirstSampleCeil) {
      const ratio = (blockFirstSampleCeil - blockFirstSample) / 1;
      const value = (channelData[blockFirstSampleCeil] * (1 - ratio)) + (channelData[blockFirstSampleCeil - 1] * ratio);
      blockNegMax = Math.min(blockNegMax, value);
      blockPosMax = Math.max(blockPosMax, value);
    }

    // interpolate last sample
    if (blockLastSample > blockLastSampleFloor) {
      const ratio = (blockLastSample - blockLastSampleFloor) / 1;
      const value = (channelData[blockLastSampleFloor] * (1 - ratio)) + (channelData[blockLastSampleFloor + 1] * ratio);
      blockNegMax = Math.min(blockNegMax, value);
      blockPosMax = Math.max(blockPosMax, value);
    }

    // iterate samples within block
    if (blockFirstSampleCeil <= blockLastSampleFloor) {
      for (let j = blockFirstSampleCeil; j <= blockLastSampleFloor; j++) {
        const value = channelData[j];
        blockNegMax = Math.min(blockNegMax, value);
        blockPosMax = Math.max(blockPosMax, value);
      }
    }

    blocksNeg.push(blockNegMax);
    blocksPos.push(blockPosMax);
  }

  return { blocksNeg, blocksPos };
}

/**
 * App state changed.
 * @param {Object} e Custom event.
 */
function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.RECORD_START:
      startRecording(state);
      break;
    
    case actions.AUDIORECORDING_DECODED:
      addToRecording(state);
      break;

    case actions.AUDIOFILE_DECODED:
    case actions.RECORD_ERASE:
    case actions.RECORD_STORE:
    case actions.TOGGLE_RECORDING:
      showWaveform(state, true);
      // showRecordingLocator(state);
      break;
    
    case actions.HANDLE_MIDI_MESSAGE:
    case actions.NEW_PROJECT:
    case actions.RELOAD_AUDIOFILE_ON_SAME_PAD:
    case actions.SELECT_SOUND:
      showWaveform(state, false);
      break;
    
    case actions.SET_WAVEFORM_POSITION:
    case actions.SET_WAVEFORM_ZOOM:
      setPositionAndZoom(state);
      break;
  }
}

/**
 * Window resize event handler.
 * @param {Boolean} isFirstRun True if function is called as part of app setup.
 */
function handleWindowResize() {
	canvasEl.height = rootEl.clientHeight;
  canvasEl.width = rootEl.clientWidth;
  canvasRect = canvasEl.getBoundingClientRect();
  cache.length = 0;
  numBlocks = canvasEl.width;
  blockSize = NUM_SAMPLES / numBlocks;
  amplitude = canvasRect.height / 2;
  drawWaveform();
}

/**
 * General module setup.
 */
export function setup() {
  rootEl = document.querySelector('#waveform');
  canvasEl = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
  rootEl.appendChild(canvasEl);
  ctx = canvasEl.getContext('2d');

  addEventListeners();
  handleWindowResize();
}

/**
 * Show a complete waveform after drag, reload or resize.
 * @param {Object} state Application state.
 * @param {Boolean} isRedraw True if image cache must be cleared and waveform redrawn.
 */
function showWaveform(state, isRedraw) {
  const { pads, selectedIndex } = state;

  if (!pads[selectedIndex]) {
    clearWaveform();
    return;
  }

  cacheIndex = selectedIndex;

  if (isRedraw) {
    cache[cacheIndex] = null;
  }

  if (!cache[cacheIndex]) {
    const buffer = getBuffer(selectedIndex);

    if (!buffer) {
      clearWaveform();
      return;
    }
  
    channelData = buffer.getChannelData(0);
  }

  drawWaveform();
}

/**
 * Initialise the recording process.
 * @param {Object} state Application state.
 */
function startRecording(state) {
  const { selectedIndex } = state;
  cacheIndex = selectedIndex;
  clearWaveform();
  cache[cacheIndex] = null;
}
