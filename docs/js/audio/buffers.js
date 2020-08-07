import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { getContext } from './audio.js';

const buffers = [];

/**
 * Provide audio buffer.
 * @param {Number} index Buffer index.
 * @returns {Object} AudioBuffer.
 */
export function getBuffer(index) {
  return buffers[index];
}

/**
 * Handle application state changes.
 * @param {Event} e Custom event.
 */
function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

		case actions.LOAD_AUDIOFILE:
			loadAudioToPad(state, action);
			break;
  }
}

/**
 * 
 * @param {Object} state Application state.
 * @param {Object} action Action object.
 */
function loadAudioToPad(state, action) {
  const { file, padIndex } = action;
  const ctx = getContext();
  const fileReader = new FileReader();

  fileReader.onload = (fileEvent) => {
    const arrayBuffer = fileEvent.target.result;
    ctx.decodeAudioData(arrayBuffer).then((audioBuffer) => {
      buffers[padIndex] = audioBuffer;
    });
  };

  fileReader.readAsArrayBuffer(file);
}

/**
 * General module setup.
 */
export function setup() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);
}
