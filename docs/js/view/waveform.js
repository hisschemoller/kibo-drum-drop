import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getBuffer } from '../audio/audio.js';
import addWindowResizeCallback from './windowresize.js';
import { maxRecordingLength, sampleRate } from '../utils/utils.js';

const padding = 10;
const fillColor = '#eee';
const strokeColor = '#999';
const recordLocatorColor = '#f00';
const backgroundColorCapture = '#333';
const fillColorCapture = '#fff';
const strokeColorCapture = '#fff';
const bufferDefaultLength = sampleRate * maxRecordingLength;
const addReducer = (accumulator, currentValue) => accumulator + currentValue;
const cache = [];
let rootEl,
  canvasEl,
  canvasRect,
  ctx,
  channelData, 
  numBlocks, 
  blockSize, 
  firstSample,
  numSamples,
  cacheIndex,
  captureBufferPosition,
  isCapturing;

function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
  addWindowResizeCallback(handleWindowResize);
}

/**
 * Clear the waveform canvas.
 */
function clearWaveform() {
  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
}

/**
 * Draw waveform, filled or line based on blockSize.
 */
function drawWaveform() {
  if (cache[cacheIndex]) {
    ctx.putImageData(cache[cacheIndex], 0, 0);
  } else {
    if (!channelData) {
      return;
    }

    numBlocks = canvasEl.width;
    blockSize = numSamples / numBlocks;

    // Number.EPSILON will disable single line waveform
    if (blockSize < Number.EPSILON) {
      drawWaveformLine();
    } else {
      drawWaveformFilled();
    }
    cache[cacheIndex] = ctx.getImageData(0, 0, canvasRect.width, canvasRect.height);
  }
}

/**
 * Draw waveform as a filled shape. Best for long samples.
 */
function drawWaveformFilled() {
  const blocksNeg = [];
  const blocksPos = [];

  // collect data
  for (let i = 0; i < numBlocks; i++) {
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

  // draw
  const amplitude = canvasRect.height / 2;
  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  if (isCapturing) {
    const numBlocksCaptured = Math.ceil((captureBufferPosition / bufferDefaultLength) * numBlocks);

    // zero line 
    ctx.strokeStyle = strokeColor;
    ctx.moveTo(0, amplitude);
    ctx.lineTo(numBlocks, amplitude);
    ctx.stroke();

    // capture background
    ctx.fillStyle = backgroundColorCapture;
    ctx.fillRect(0, 0, numBlocksCaptured, canvasRect.height);

    // capture graph
    ctx.save();
    ctx.translate(0, amplitude);
    ctx.fillStyle = fillColorCapture;
    ctx.strokeStyle = strokeColorCapture;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 0, n = numBlocksCaptured; i < n; i++) {
      ctx.lineTo(i, blocksPos[i] * (amplitude - padding));
    }
    for (let i = numBlocksCaptured - 1; i >= 0; i--) {
      ctx.lineTo(i, blocksNeg[i] * (amplitude - padding));
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
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
}

/**
 * Draw waveform as a single line. Best for short samples.
 */
function drawWaveformLine() {
  let blocksMax = 0;
  let blocksMin = 0;
  const blocks = [];
  for (let i = 0; i < numBlocks; i++) {
    const blockFirstSample = firstSample + (blockSize * i);
    const blockFirstSampleCeil = Math.ceil(blockFirstSample);
    const blockLastSample = blockFirstSample + blockSize;
    const blockLastSampleFloor = Math.floor(blockLastSample);
    const blockValues = [];

    // interpolate first sample
    if (blockFirstSample < blockFirstSampleCeil) {
      const ratio = (blockFirstSampleCeil - blockFirstSample) / 1;
      const value = (channelData[blockFirstSampleCeil] * (1 - ratio)) + (channelData[blockFirstSampleCeil - 1] * ratio);
      blockValues.push(value);
    }

    // interpolate last sample
    if (blockLastSample > blockLastSampleFloor) {
      const ratio = (blockLastSample - blockLastSampleFloor) / 1;
      const value = (channelData[blockLastSampleFloor] * (1 - ratio)) + (channelData[blockLastSampleFloor + 1] * ratio);
      blockValues.push(value);
    }

    // iterate samples within block
    if (blockFirstSampleCeil <= blockLastSampleFloor) {
      for (let j = blockFirstSampleCeil; j <= blockLastSampleFloor; j++) {
        const value = channelData[j];
        blockValues.push(value);
      }
    }

    const blockAverage = blockValues.reduce(addReducer, 0) / blockValues.length;
    blocks.push(blockAverage);
    blocksMax = Math.max(blockAverage, blocksMax);
    blocksMin = Math.min(blockAverage, blocksMin);
  }
  const max = Math.max(blocksMax, -blocksMin);

  // normalize
  const blocksNormalized = blocks.map(value => value / max);

  // draw
  const amplitude = canvasRect.height / 2;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  ctx.save();
  ctx.translate(0, amplitude);
  ctx.strokeStyle = strokeColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  blocksNormalized.forEach((value, index) => {
    ctx.lineTo(index, value * (amplitude - padding));
  });
  ctx.stroke();
  ctx.restore();
}

/**
 * App state changed.
 * @param {Object} e Custom event.
 */
function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.AUDIOFILE_DECODED:
    case actions.RECORD_ERASE:
    case actions.TOGGLE_RECORDING:
      showWaveform(state, true);
      // showRecordingLocator(state);
      break;
    
    case actions.HANDLE_MIDI_MESSAGE:
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
  drawWaveform();
}

/**
 * General module setup.
 */
export function setup() {
  rootEl = document.querySelector('#waveform');
  canvasEl = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
  rootEl.appendChild(canvasEl);
	canvasEl.height = rootEl.clientHeight;
  canvasEl.width = rootEl.clientWidth;
  canvasRect = canvasEl.getBoundingClientRect();
  ctx = canvasEl.getContext('2d');

  addEventListeners();
}

/**
 * Redraw after changed zoom level.
 * @param {Object} state App state.
 */
function setPositionAndZoom(state) {
  const { pads, selectedIndex } = state;
  const { firstWaveformSample, numWaveformSamples } = pads[selectedIndex];
  firstSample = firstWaveformSample;
  numSamples = numWaveformSamples;
  drawWaveform();
}

/**
 * 
 * @param {*} state 
 */
// function showRecordingLocator(state) {
//   ({ captureBufferPosition, isCapturing } = state);
//   const { pads, selectedIndex } = state;
//   const buffer = getBuffer(selectedIndex);
  
//   if (buffer && isCapturing) {

//     // draw the locator
//     const x = (captureBufferPosition / bufferDefaultLength) * canvasRect.width;
//     ctx.lineWidth = 3;
//     ctx.strokeStyle = recordLocatorColor;
//     ctx.beginPath();
//     ctx.moveTo(x, 0);
//     ctx.lineTo(x, canvasRect.height);
//     ctx.stroke();
//   }
// }

/**
 * 
 * @param {Object} state Application state.
 */
function showWaveform(state, isRedraw) {
  ({ captureBufferPosition, isCapturing } = state);
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
    const { firstWaveformSample, numWaveformSamples, } = pads[selectedIndex];
    const buffer = getBuffer(selectedIndex);
  
    if (!buffer) {
      clearWaveform();
      return;
    }
  
    firstSample = firstWaveformSample;
    numSamples = numWaveformSamples;
    channelData = buffer.getChannelData(0);
  }

  drawWaveform();
}
