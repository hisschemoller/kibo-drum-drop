import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getBuffer } from '../audio/audio.js';

let rootEl, canvasEl, ctx, channelData;

function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
}

function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.LOAD_AUDIOFILE:
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
  const { pads, selectedIndex } = state;
  const buffer = getBuffer(selectedIndex);
  channelData = buffer.getChannelData(0);
  console.log(buffer);
  console.log(channelData);
  console.log(channelData.length);
  console.log(canvasEl);

  const samples = canvasEl.width;
  const blockSize = Math.floor(channelData.length / samples);
  console.log(samples);
  console.log(channelData.length, samples, blockSize);
  const neg = [];
  const pos = [];
  for (let i = 0; i < samples; i++) {
    let blockStart = blockSize * i;
    let sumNeg = [];
    let sumPos = [];
    for (let j = 0; j < blockSize; j++) {
      const value =channelData[blockStart + j];
      if (value >= 0) {
        sumPos.push(value);
      } else {
        sumNeg.push(value);
      }
    }
    const reducer = (accumulator, currentValue) => accumulator + currentValue;
    neg.push(sumNeg.reduce(reducer / sumNeg.length));
    pos.push(sumPos.reduce(reducer / sumPos.length));
  }
  console.log(neg);
  console.log(pos);
}
