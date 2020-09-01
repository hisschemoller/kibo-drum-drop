import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getBuffer } from '../audio/audio.js';
import addWindowResizeCallback from './windowresize.js';

const padding = 10;
const fillColor = '#eee';
const strokeColor = '#999';
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
  startOffsetCtx,
  sampleStartOffset,
  startOffsetX,
  isStartOffsetAtRightEdge;

function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
  canvasEl.addEventListener('mousedown', handleMouseDown);
  addWindowResizeCallback(handleWindowResize);
}

/**
 * Draw waveform, filled or line based on blockSize.
 */
function drawWaveform() {
  if (!channelData) {
    return;
  }

  numBlocks = canvasEl.width;
  blockSize = numSamples / numBlocks;
  startOffsetX = (sampleStartOffset - firstSample) / blockSize;

  // Number.EPSILON === disable line
  if (blockSize < Number.EPSILON) {
    drawWaveformLine();
  } else {
    drawWaveformFilled();
  }

  ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  ctx.drawImage(offscreenCanvas, 0, 0);

  // the sample start offset pointer
  if (startOffsetX >= 0 && startOffsetX < canvasRect.width) {
    updateStartOffsetImage(startOffsetCtx);
    const x = isStartOffsetAtRightEdge ? startOffsetX - startOffsetWidth : startOffsetX;
    ctx.drawImage(startOffsetCtx.canvas, x, 0);
  }
}

/**
 * Draw waveform as a filled shape. Best for long samples.
 */
function drawWaveformFilled() {
  const blocksNeg = [];
  const blocksPos = [];

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

  // normalize
  const blocksNegNormalized = blocksNeg.map(value => value / maxAmpl);
  const blocksPosNormalized = blocksPos.map(value => value / maxAmpl);

  // draw
  const amplitude = canvasRect.height / 2;
  offscreenCtx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  offscreenCtx.save();
  offscreenCtx.translate(0, amplitude);
  offscreenCtx.lineWidth = 2;
  offscreenCtx.fillStyle = fillColor;
  offscreenCtx.strokeStyle = strokeColor;
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
  offscreenCtx.clearRect(0, 0, canvasRect.width, canvasRect.height);
  offscreenCtx.save();
  offscreenCtx.translate(0, amplitude);
  offscreenCtx.lineWidth = 2;
  offscreenCtx.strokeStyle = strokeColor;
  offscreenCtx.beginPath();
  offscreenCtx.moveTo(0, 0);
  blocksNormalized.forEach((value, index) => {
    offscreenCtx.lineTo(index, value * (amplitude - padding));
  });
  offscreenCtx.stroke();
  offscreenCtx.restore();
}

/**
 * Mouse down.
 * @param {Object} e Event
 */
function handleMouseDown(e) {
  previousClientX = e.clientX;
  previousClientY = e.clientY;

  // check if mouse is on the startOffset dragger
  const canvasX = e.clientX - canvasRect.left;
  const canvasY = e.clientY - canvasRect.top;
  const offsetX = isStartOffsetAtRightEdge ? startOffsetX - startOffsetWidth : startOffsetX;
  if (canvasX >= offsetX && canvasX < offsetX + startOffsetWidth &&
    canvasY >= canvasRect.height - startOffsetWidth && canvasY < canvasRect.height) {
    document.addEventListener('mousemove', handleMouseMoveStartOffset);
    document.addEventListener('mouseup', handleMouseUpStartOffset);
  } else {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
}

/**
 * Mouse moved, while dragging waveform background.
 * @param {Object} e Event
 */
function handleMouseMove(e) {

  // vertical drag changes zoom level
  if (e.clientY !== previousClientY) {
    const distanceInPixels = previousClientY - e.clientY;
    previousClientY = e.clientY;

    // get new length of audio in view
    const maxNewNumSamples = channelData.length;
    const minNewNumSamples = numBlocks * 0.1;
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

  // horizontal drag changes waveform position.
  if (e.clientX !== previousClientX) {
    const distanceInPixels = previousClientX - e.clientX;
    const distanceInSamples = distanceInPixels * blockSize;
    previousClientX = e.clientX;
    const maxNewFirstSample = channelData.length - numSamples;
    const newFirstSample = Math.max(0, Math.min(firstSample + distanceInSamples, maxNewFirstSample));

    dispatch(getActions().setWaveformPosition(newFirstSample));
  }
}

/**
 * Mouse moved, while dragging start offset pointer.
 * @param {Object} e Event
 */
function handleMouseMoveStartOffset(e) {
  if (e.clientX !== previousClientX) {
    const distanceInPixels = e.clientX - previousClientX;
    previousClientX = e.clientX;
    const distanceInSamples = distanceInPixels * blockSize;
    const newSampleStartOffset = Math.max(0, Math.min(sampleStartOffset + distanceInSamples, channelData.length - 1));
    
    dispatch(getActions().setSampleStartOffset(newSampleStartOffset));
  }
}

/**
 * Mouse up.
 * @param {Object} e Event
 */
function handleMouseUp(e) {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

/**
 * Mouse up, after dragging start offset pointer.
 * @param {Object} e Event
 */
function handleMouseUpStartOffset(e) {
  document.removeEventListener('mousemove', handleMouseMoveStartOffset);
  document.removeEventListener('mouseup', handleMouseUpStartOffset);

  updateStartOffsetImage(startOffsetCtx);
  
  // const isVisible = (sampleStartOffset >= firstSample) && (sampleStartOffset < firstSample + numSamples);
  // const positionNormalized = (sampleStartOffset - firstSample) / numSamples;
  // const positionInPixels = positionNormalized * canvasRect.width;
  // const isAtRightEdge = positionInPixels > canvasRect.width - startOffsetWidth && positionInPixels < canvasRect.width;
  // console.log(isVisible, positionNormalized, positionInPixels, isAtRightEdge);
}

/**
 * App state changed.
 * @param {Object} e Custom event.
 */
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

  const c = new OffscreenCanvas(startOffsetWidth, canvasRect.height);
  startOffsetCtx = c.getContext('2d');

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

/**
 * Draw the start offset pointer based on position on the canvas.
 * @param {Object} ctx CanvasRenderingContext2D.
 */
function updateStartOffsetImage(ctx) {

  // test if the pointer is at the right edge of the canvass
  const positionNormalized = (sampleStartOffset - firstSample) / numSamples;
  const positionInPixels = positionNormalized * canvasRect.width;
  const isAtRightEdge = positionInPixels > canvasRect.width - startOffsetWidth && positionInPixels < canvasRect.width;

  // redraw
  if (isAtRightEdge !== isStartOffsetAtRightEdge) {
    isStartOffsetAtRightEdge = isAtRightEdge;

    const x = isAtRightEdge ? startOffsetWidth - 1 : 1;
    const halfWidth = (startOffsetWidth * 0.5) - 1;
    const circleY = canvasRect.height - halfWidth - 1;

    ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, circleY);
    if (isAtRightEdge) {
      ctx.ellipse(x - halfWidth, circleY, halfWidth, halfWidth, 0, 0, 2 * Math.PI);
    } else {
      ctx.ellipse(x + halfWidth, circleY, halfWidth, halfWidth, Math.PI, 0, 2 * Math.PI);
    }
    ctx.stroke();
  }
}
