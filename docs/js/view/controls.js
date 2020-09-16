import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { pitches } from '../utils/utils.js';
import { NOTE_ON, NOTE_OFF } from '../midi/midi.js';

let rootEl, settingsBtn, shapeEls, waveformEl;
let resetKeyCombo = [];
let dragIndex = -1;
let mouseDownTimeoutId;

/**
 * Add event listeners.
 */
function addEventListeners() {
  document.addEventListener(STATE_CHANGE, handleStateChanges);

  document.addEventListener('keydown', e => {

    // don't perform shortcuts while typing in a text input.
    if (!(e.target.tagName.toLowerCase() == 'input' && e.target.getAttribute('type') == 'text')) {
      switch (e.keyCode) {
        case 82: // r
        case 83: // s
        case 84: // t
          // clear all data on key combination 'rst' (reset)
          resetKeyCombo.push(e.keyCode);
          if (resetKeyCombo.indexOf(82) > -1 && resetKeyCombo.indexOf(83) > -1 && resetKeyCombo.indexOf(84) > -1) {
            console.log('Reset.');
            localStorage.clear();
            dispatch(getActions().newProject());
          }
          break;
        
        case 87: // w
          console.log('state', getState());
          break;
        
        case 49: // 1
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56: // 8
          dispatch(getActions().playNote(NOTE_ON, 1, pitches[e.keyCode - 49], 120));
          break;
      }
    }
  });

  document.addEventListener('keyup', e => {
    resetKeyCombo.length = 0;

    // don't perform shortcuts while typing in a text input.
    if (!(e.target.tagName.toLowerCase() == 'input' && e.target.getAttribute('type') == 'text')) {
      switch (e.keyCode) {
        
        case 49: // 1
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56: // 8
          dispatch(getActions().playNote(NOTE_OFF, 1, pitches[e.keyCode - 49], 0));
          break;
      }
    }
  });

  settingsBtn.addEventListener('click',e => {
    dispatch(getActions().toggleSettings(true));
  });

  shapeEls.forEach(shapeEl => {
    shapeEl.addEventListener('dragenter', handleDrag);
    shapeEl.addEventListener('dragover', handleDrag);
    shapeEl.addEventListener('dragleave', handleDragLeave);
    shapeEl.addEventListener('drop', handleDrop);
    shapeEl.addEventListener('mousedown', handlePadMouseDown);
  });

  waveformEl.addEventListener('dragenter', handleWaveformDrag);
  waveformEl.addEventListener('dragover', handleWaveformDrag);
  waveformEl.addEventListener('dragleave', handleWaveformDragLeave);
  waveformEl.addEventListener('drop', handleWaveformDrop);
}

/**
 * Mouse up anywhere in document.
 * @param {Object} e event.
 */
function handleDocumentMouseUp(e) {
  e.preventDefault();
  clearTimeout(mouseDownTimeoutId);
  document.removeEventListener('mouseup', handleDocumentMouseUp);
  dispatch(getActions().toggleRecording(false));
}

/**
 * Drag enters or is over pad shapes.
 * @param {Object} e event.
 */
function handleDrag(e) {
  e.preventDefault();
  if (dragIndex > -1) {
    shapeEls.item(dragIndex).classList.remove('shape--dragover');
  }
  dragIndex = Array.from(e.target.parentNode.children).indexOf(e.target);
  shapeEls.item(dragIndex).classList.add('shape--dragover');
}

/**
 * Drag leaves pad shapes.
 * @param {Object} e event.
 */
function handleDragLeave(e) {
  e.preventDefault();
  if (dragIndex > -1) {
    shapeEls.item(dragIndex).classList.remove('shape--dragover');
  }
  dragIndex = -1;
}

/**
 * Drop on pad shapes.
 * @param {Object} e event.
 */
function handleDrop(e) {
  e.preventDefault();
  if (dragIndex > -1) {
    shapeEls.item(dragIndex).classList.remove('shape--dragover');
    dispatch(getActions().loadAudioFile(e.dataTransfer.files, dragIndex));
  }
}

/**
 * Mouse down on pad shapes.
 * @param {Object} e event.
 */
function handlePadMouseDown(e) {
  e.preventDefault();
  const index = [ ...e.target.parentElement.children ].indexOf(e.target);
  document.addEventListener('mouseup', handleDocumentMouseUp);

  mouseDownTimeoutId = setTimeout(() => {

    // start recording
    dispatch(getActions().toggleRecording(true));
  }, 500);

  dispatch(getActions().selectSound(index));
}

/**
 * Application state changed.
 * @param {Object} e Custom event.
 */
function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.PLAY_NOTE:
      playNote(state);
      break;
    
		case actions.LOAD_AUDIOFILE:
    case actions.RECORD_AUDIOSTREAM:
    case actions.SELECT_SOUND:
			updateShapes(state);
      break;
    
    case actions.SET_PROJECT:
      updateShapes(state);
      break;
  }
}

/**
 * Drag enters or is over waveform element.
 * @param {Object} e event.
 */
function handleWaveformDrag(e) {
  e.preventDefault();
  waveformEl.classList.add('waveform--dragover');
}

/**
 * Drag leaves waveform element.
 * @param {Object} e event.
 */
function handleWaveformDragLeave(e) {
  e.preventDefault();
  waveformEl.classList.remove('waveform--dragover');
}

/**
 * Drop on waveform element.
 * @param {Object} e event.
 */
function handleWaveformDrop(e) {
  e.preventDefault();
  waveformEl.classList.remove('waveform--dragover');
  dispatch(getActions().loadAudioFile(e.dataTransfer.files));
}

/**
 * Update shape elements appearance to indicate play state.
 * @param {Object} state Application state.
 */
function playNote(state) {
  const { note } = state;
  const { command, index, velocity } = note;
  if (index > -1) {
    if (command === NOTE_ON) {
      shapeEls.item(index).classList.add('shape--play');
    } else {
      shapeEls.item(index).classList.remove('shape--play');
    }
  }
}

/**
 * General module setup.
 */
export function setup() {
  rootEl = document.querySelector('#controls');
  settingsBtn = document.querySelector('#settings-btn');
  shapeEls = document.querySelectorAll('.shape');
  waveformEl = document.querySelector('#waveform');
  addEventListeners();
}

/**
 * Update shape elements appearance.
 * @param {Object} state Application state.
 */
function updateShapes(state) {
  const { note, pads, selectedIndex } = state;
  const { index } = note;
  shapeEls.forEach((shapeEl, index) => {
    if (pads[index]) {
      shapeEl.classList.add('shape--assigned');
      if (index === selectedIndex) {
        shapeEl.classList.add('shape--selected');
      } else {
        shapeEl.classList.remove('shape--selected');
      }
    } else {
      shapeEl.classList.remove('shape--assigned');
    }
  });
}
