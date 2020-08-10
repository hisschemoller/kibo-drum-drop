import { dispatch, getActions, getState, STATE_CHANGE, } from '../store/store.js';
import { pitches } from '../utils/utils.js';
import { NOTE_ON, NOTE_OFF } from '../midi/midi.js';

let rootEl, settingsBtn, shapeEls;
let resetKeyCombo = [];
let dragIndex = -1;

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
  });
}

function handleDrag(e) {
  e.preventDefault();
  if (dragIndex > -1) {
    shapeEls.item(dragIndex).classList.remove('shape--dragover');
  }
  dragIndex = Array.from(e.target.parentNode.children).indexOf(e.target);
  shapeEls.item(dragIndex).classList.add('shape--dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  if (dragIndex > -1) {
    shapeEls.item(dragIndex).classList.remove('shape--dragover');
  }
  dragIndex = -1;
}

function handleDrop(e) {
  e.preventDefault();
  if (dragIndex > -1) {
    shapeEls.item(dragIndex).classList.remove('shape--dragover');
    dispatch(getActions().loadAudioFile(e.dataTransfer.files, dragIndex));
  }
}

function handleStateChanges(e) {
  const { state, action, actions, } = e.detail;
  switch (action.type) {

    case actions.PLAY_NOTE:
      playNote(state);
      break;
    
		case actions.LOAD_AUDIOFILE:
    case actions.SET_PROJECT:
			updateShapes(state);
			break;
  }
}

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

export function setup() {
  rootEl = document.querySelector('#controls');
  settingsBtn = rootEl.querySelector('#controls__settings');
  shapeEls = document.querySelectorAll('.shape');
  addEventListeners();
}

function updateShapes(state) {
  const { note, pads } = state;
  const { index } = note;
  shapeEls.forEach((shapeEl, index) => {
    if (pads[index]) {
      shapeEl.classList.add('shape--assigned');
    } else {
      shapeEl.classList.remove('shape--assigned');
    }
  });
}
