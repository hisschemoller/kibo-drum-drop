import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getBuffer } from '../audio/audio.js';
import addWindowResizeCallback from './windowresize.js';

const padding = 10;
const addReducer = (accumulator, currentValue) => accumulator + currentValue;
const startOffsetWidth = 40;
let rootEl,
  canvasEl,
  canvasRect,
  ctx,
  offscreenCanvas,
  offscreenCtx,
  channelData, 
  numBlocks, 
  blockSize, 
  previousClientX, 
  previousClientY, 
  firstSample,
  numSamples,
  maxAmpl,
  startOffsetCanvas,
  sampleStartOffset,
  startOffsetX;

function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
  canvasEl.addEventListener('mousedown', handleMouseDown);
  addWindowResizeCallback(handleWindowResize);
}

/**
 * 
 */
function createStartOffsetImage() {
  const canvas = new OffscreenCanvas(startOffsetWidth, canvasRect.height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f00';
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(1, canvasRect.height - 1);
  ctx.lineTo(startOffsetWidth - 1, canvasRect.height- 1);
  ctx.lineTo(startOffsetWidth - 1, canvasRect.height - startOffsetWidth);
  ctx.lineTo(1, canvasRect.height - startOffsetWidth);
  ctx.stroke();
  return canvas;
}

/**
 * Draw waveform, filled or line based on blockSize.
 */
function drawWaveform() {
  if (!channelData) {
    return;
  }

  numBlocks = canvasEl.width;
  blockSize = Math.floor(numSamples / numBlocks);
  startOffsetX = (sampleStartOffset - firstSample) / blockSize;

  if (blockSize < 1) {
    drawWaveformLine();
  } else {
    drawWaveformFilled();
  }

  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  ctx.drawImage(offscreenCanvas, 0, 0);

  // the sample start offset pointer
  if (startOffsetX >= 0 && startOffsetX < canvasRect.width) {
    ctx.drawImage(startOffsetCanvas, startOffsetX, 0);
  }
}

/**
 * Draw waveform as a filled shape. Best for long samples.
 */
function drawWaveformFilled() {
  const firstSampleInt = Math.floor(firstSample);
  const blocksNeg = [];
  const blocksPos = [];
  for (let i = 0; i < numBlocks; i++) {
    const blockStart = firstSampleInt + (blockSize * i);
    let blockNegMax = 0;
    let blockPosMax = 0;
    for (let j = 0; j < blockSize; j++) {
      const value = channelData[blockStart + j];
      blockNegMax = Math.min(blockNegMax, value);
      blockPosMax = Math.max(blockPosMax, value);
    }
    blocksNeg.push(blockNegMax);
    blocksPos.push(blockPosMax);
  }

  // normalize
  const blocksNegNormalized = blocksNeg.map(value => value / maxAmpl);
  const blocksPosNormalized = blocksPos.map(value => value / maxAmpl);

  // draw
  const amplitude = canvasRect.height / 2;
  offscreenCtx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  offscreenCtx.save();
  offscreenCtx.translate(0, amplitude);
  offscreenCtx.lineWidth = 2;
  offscreenCtx.fillStyle = '#eee';
  offscreenCtx.strokeStyle = '#aaa';
  offscreenCtx.beginPath();
  offscreenCtx.moveTo(0, 0);
  blocksPosNormalized.forEach((value, index) => {
    offscreenCtx.lineTo(index, value * (amplitude - padding));
  });
  for (let i = blocksNegNormalized.length - 1; i >= 0; i--) {
    offscreenCtx.lineTo(i, blocksNegNormalized[i] * (amplitude - padding));
  }
  offscreenCtx.fill();
  offscreenCtx.stroke();
  offscreenCtx.restore();
}

/**
 * Draw waveform as a single line. Best for short samples.
 */
function drawWaveformLine() {
  const firstSampleInt = Math.floor(firstSample);
  let blocksMax = 0;
  let blocksMin = 0;
  const blocks = [];
  for (let i = 0; i < numBlocks; i++) {
    const blockStart = firstSampleInt + (blockSize * i);
    const blockValues = [];
    for (let j = 0; j < blockSize; j++) {
      const value = channelData[blockStart + j];
      blockValues.push(value);
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
  offscreenCtx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  offscreenCtx.save();
  offscreenCtx.translate(0, amplitude);
  offscreenCtx.lineWidth = 2;
  offscreenCtx.strokeStyle = '#aaa';
  offscreenCtx.beginPath();
  offscreenCtx.moveTo(0, 0);
  blocksNormalized.forEach((value, index) => {
    offscreenCtx.lineTo(index, value * (amplitude - padding));
  });
  offscreenCtx.stroke();
  offscreenCtx.restore();
}

function handleMouseDown(e) {
  previousClientX = e.clientX;
  previousClientY = e.clientY;
  document.addEventListener('mouseup', handleMouseUp);

  // check if mouse is on the startOffset dragger
  const canvasX = e.clientX - canvasRect.left;
  const canvasY = e.clientY - canvasRect.top;
  if (canvasX >= startOffsetX && canvasX < startOffsetX + startOffsetWidth &&
    canvasY >= canvasRect.height - startOffsetWidth && canvasY < canvasRect.height) {
    document.addEventListener('mousemove', handleMouseMoveStartOffset);
  } else {

    document.addEventListener('mousemove', handleMouseMove);
  }
}

function handleMouseMove(e) {
  if (e.clientY !== previousClientY) {
    const distanceInPixels = previousClientY - e.clientY;
    previousClientY = e.clientY;

    // get new length of audio in view
    const maxNewNumSamples = channelData.length;
    const minNewNumSamples = numBlocks;
    let newNumSamples = numSamples * (1 + (distanceInPixels / 100));
    newNumSamples = Math.max(minNewNumSamples, Math.min(newNumSamples, maxNewNumSamples));

    // get new position of audio in view
    const numSampleChange = newNumSamples - numSamples;
    const maxNewFirstSample = channelData.length - newNumSamples;
    const mouseXNormalized = (e.clientX - canvasRect.left) / canvasRect.width;
    let newFirstSample = firstSample - (mouseXNormalized * numSampleChange);
    newFirstSample = Math.max(0, Math.min(newFirstSample, maxNewFirstSample));

    dispatch(getActions().setWaveformZoom(newFirstSample, newNumSamples));
  }

  if (e.clientX !== previousClientX) {
    const distanceInPixels = previousClientX - e.clientX;
    const distanceInSamples = distanceInPixels * blockSize;
    previousClientX = e.clientX;
    const maxNewFirstSample = channelData.length - numSamples;
    const newFirstSample = Math.max(0, Math.min(firstSample + distanceInSamples, maxNewFirstSample));

    dispatch(getActions().setWaveformPosition(newFirstSample));
  }
}

function handleMouseMoveStartOffset(e) {
  if (e.clientX !== previousClientX) {
    const distanceInPixels = e.clientX - previousClientX;
    previousClientX = e.clientX;
    const distanceInSamples = distanceInPixels * blockSize;
    const newSampleStartOffset = Math.max(0, Math.min(sampleStartOffset + distanceInSamples, channelData.length - 1));
    
    dispatch(getActions().setSampleStartOffset(newSampleStartOffset));
  }
}

function handleMouseUp(e) {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mousemove', handleMouseMoveStartOffset);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.AUDIOFILE_DECODED:
    case actions.SELECT_SOUND:
      showWaveform(state);
      break;
    
    case actions.SET_WAVEFORM_POSITION:
    case actions.SET_WAVEFORM_ZOOM:
      setPositionAndZoom(state);
      break;

    case actions.SET_SAMPLE_START_OFFSET:
      setStartOffset(state);
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
  offscreenCanvas.height = rootEl.clientHeight;
  offscreenCanvas.width = rootEl.clientWidth;
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

  offscreenCanvas = new OffscreenCanvas(canvasRect.width, canvasRect.height);
  offscreenCtx = offscreenCanvas.getContext('2d');

  startOffsetCanvas = createStartOffsetImage();

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

function setStartOffset(state) {
  const { pads, selectedIndex } = state;
  const { startOffset } = pads[selectedIndex];
  sampleStartOffset = startOffset;

  drawWaveform();
}

/**
 * 
 * @param {Object} state Application state.
 */
function showWaveform(state) {
  const { pads, selectedIndex } = state;

  if (!pads[selectedIndex]) {
    return;
  }

  const { firstWaveformSample, maxAmplitude, numWaveformSamples, startOffset, } = pads[selectedIndex];
  const buffer = getBuffer(selectedIndex);

  if (!buffer) {
    return;
  }

  firstSample = firstWaveformSample;
  numSamples = numWaveformSamples;
  channelData = buffer.getChannelData(0);
  maxAmpl = maxAmplitude;
  sampleStartOffset = startOffset;

  drawWaveform();
}
