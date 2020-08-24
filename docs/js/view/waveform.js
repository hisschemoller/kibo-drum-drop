import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getBuffer } from '../audio/audio.js';

const padding = 10;
let rootEl, canvasEl, ctx;

function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
}

function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.AUDIOFILE_DECODED:
    case actions.SELECT_SOUND:
      showWaveform(state);
      break;
  }
}

export function setup() {
  rootEl = document.querySelector('#waveform');
  canvasEl = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
  rootEl.appendChild(canvasEl);
	canvasEl.height = rootEl.clientHeight;
  canvasEl.width = rootEl.clientWidth;
  ctx = canvasEl.getContext('2d');

  addEventListeners();
}

/**
 * 
 * @param {Object} state Application state.
 */
function showWaveform(state) {
  const { selectedIndex } = state;
  const buffer = getBuffer(selectedIndex);

  if (!buffer) {
    return;
  }

  const channelData = buffer.getChannelData(0);
  const numBlocks = canvasEl.width;
  const blockSize = Math.floor(channelData.length / numBlocks);
  const reducer = (accumulator, currentValue) => accumulator + currentValue;

  if (blockSize < 1) {
    showWaveformLine(numBlocks, blockSize, channelData, reducer);
  } else {
    showWaveformFilled(numBlocks, blockSize, channelData, reducer);
  }
}

function showWaveformLine(numBlocks, blockSize, channelData, reducer) {
  let blocksMax = 0;
  let blocksMin = 0;
  const blocks = [];
  for (let i = 0; i < numBlocks; i++) {
    const blockStart = blockSize * i;
    const blockValues = [];
    for (let j = 0; j < blockSize; j++) {
      const value = channelData[blockStart + j];
      blockValues.push(value);
    }
    const blockAverage = blockValues.reduce(reducer, 0) / blockValues.length;
    blocks.push(blockAverage);
    blocksMax = Math.max(blockAverage, blocksMax);
    blocksMin = Math.min(blockAverage, blocksMin);
  }
  const max = Math.max(blocksMax, -blocksMin);

  // normalize
  const blocksNormalized = blocks.map(value => value / max);

  // draw
  const amplitude = canvasEl.offsetHeight / 2;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.save();
  ctx.translate(0, amplitude);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#aaa';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  blocksNormalized.forEach((value, index) => {
    ctx.lineTo(index, value * (amplitude - padding));
  });
  ctx.stroke();
  ctx.restore();
}

function showWaveformFilled(numBlocks, blockSize, channelData, reducer) {
  let blocksMax = 0;
  let blocksMin = 0;
  const blocksNeg = [];
  const blocksPos = [];
  for (let i = 0; i < numBlocks; i++) {
    const blockStart = blockSize * i;
    const blockNegValues = [0];
    const blockPosValues = [0];
    for (let j = 0; j < blockSize; j++) {
      const value = channelData[blockStart + j];
      if (value < 0) {;
        blockNegValues.push(value)
      }
      if (value > 0) {;
        blockPosValues.push(value)
      }
    }
    const blockNegAverage = blockNegValues.reduce(reducer, 0) / blockNegValues.length;
    const blockPosAverage = blockPosValues.reduce(reducer, 0) / blockPosValues.length;
    blocksNeg.push(blockNegAverage);
    blocksPos.push(blockPosAverage);
    blocksMax = Math.max(blockPosAverage, blocksMax);
    blocksMin = Math.min(blockNegAverage, blocksMin);
  }
  const max = Math.max(blocksMax, -blocksMin);

  // normalize
  const blocksNegNormalized = blocksNeg.map(value => value / max);
  const blocksPosNormalized = blocksPos.map(value => value / max);

  // draw
  const amplitude = canvasEl.offsetHeight / 2;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.save();
  ctx.translate(0, amplitude);
  ctx.lineWidth = 2;
  ctx.fillStyle = '#eee';
  ctx.strokeStyle = '#aaa';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.moveTo(0, 0);
  blocksPosNormalized.forEach((value, index) => {
    ctx.lineTo(index, value * (amplitude - padding));
  });
  for (let i = blocksNegNormalized.length - 1; i >= 0; i--) {
    ctx.lineTo(i, blocksNegNormalized[i] * (amplitude - padding));
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
