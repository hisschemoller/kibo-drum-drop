import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getBuffer } from '../audio/audio.js';

let rootEl, canvasEl, ctx, channelData;

function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
}

function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.AUDIOFILE_DECODED:
      showWaveform(state, action);
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
  const { pads, selectedIndex } = state;
  const buffer = getBuffer(selectedIndex);
  channelData = buffer.getChannelData(0);

  const samples = canvasEl.width;
  const blockSize = Math.floor(channelData.length / samples);
  const reducer = (accumulator, currentValue) => accumulator + currentValue;

  if (blockSize < 100) {
    showWaveformLine(samples, blockSize, channelData, reducer);
  } else {

  }
}

function showWaveformLine(samples, blockSize, channelData, reducer) {
  let pointsMax = 0;
  let pointsMin = 0;
  const points = [];
  for (let i = 0; i < samples; i++) {
    const blockStart = blockSize * i;
    const blockValues = [];
    for (let j = 0; j < blockSize; j++) {
      const value = channelData[blockStart + j];
      blockValues.push(value);
    }
    const blockAverage = blockValues.reduce(reducer, 0) / blockValues.length;
    points.push(blockAverage);
    pointsMax = Math.max(blockAverage, pointsMax);
    pointsMin = Math.min(blockAverage, pointsMin);
  }
  const max = Math.max(pointsMax, -pointsMin);

  // normalize
  const pointsNormalized = points.map(point => point / max);

  // draw
  const amplitude = canvasEl.offsetHeight / 2;
  ctx.translate(0, amplitude);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#aaa';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  pointsNormalized.forEach((point, index) => {
    ctx.lineTo(index, point * amplitude);
  });
  ctx.stroke();
}

function showWaveformFilled() {
  const neg = [];
  const pos = [];
  for (let i = 0; i < samples; i++) {
    let blockStart = blockSize * i;
    let negs = [];
    let sumPos = [];
    for (let j = 0; j < blockSize; j++) {
      const value = channelData[blockStart + j];
      if (value >= 0) {
        sumPos.push(value);
      } else {
        negs.push(value);
      }
    }
    const reducer = (accumulator, currentValue) => accumulator + currentValue;
    neg.push(sumNeg.reduce(reducer, 0) / negs.length);
    pos.push(sumPos.reduce(reducer, 0) / sumPos.length);
  }
}
