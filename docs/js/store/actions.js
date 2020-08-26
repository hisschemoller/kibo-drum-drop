import { createUUID, lowestOctave, numOctaves, pitches } from '../utils/utils.js';
import { NOTE_OFF } from '../midi/midi.js';
import { showDialog } from '../view/dialog.js';

const AUDIOFILE_DECODED = 'AUDIOFILE_DECODED';
const BLUETOOTH_CONNECT = 'BLUETOOTH_CONNECT';
const BLUETOOTH_DISCONNECT = 'BLUETOOTH_DISCONNECT';
const BLUETOOTH_ERROR = 'BLUETOOTH_ERROR';
const BLUETOOTH_SUCCESS = 'BLUETOOTH_SUCCESS';
const DELETE_BODIES = 'DELETE_BODIES';
const LOAD_AUDIOFILE = 'LOAD_AUDIOFILE';
const NEW_PROJECT = 'NEW_PROJECT';
const PLAY_NOTE = 'PLAY_NOTE';
const POPULATE = 'POPULATE';
const RESIZE = 'RESIZE';
const SELECT_MIDI_INPUT = 'SELECT_MIDI_INPUT';
const SELECT_SOUND = 'SELECT_SOUND';
const SET_AUDIO_OFFSET = 'SET_AUDIO_OFFSET';
const SET_MIDI_ACCESSIBLE = 'SET_MIDI_ACCESSIBLE';
const SET_WAVEFORM_POSITION = 'SET_WAVEFORM_POSITION';
const SET_WAVEFORM_ZOOM = 'SET_WAVEFORM_ZOOM';
const SET_PROJECT = 'SET_PROJECT';
const TOGGLE_SETTINGS = 'TOGGLE_SETTINGS';
const UPDATE_MIDI_PORTS = 'UPDATE_MIDI_PORTS';

// actions
export default {

  AUDIOFILE_DECODED,

  BLUETOOTH_CONNECT,
  bluetoothConnect: () => ({ type: BLUETOOTH_CONNECT }),

  BLUETOOTH_DISCONNECT,
  bluetoothDisconnect: () => ({ type: BLUETOOTH_DISCONNECT }),

  BLUETOOTH_ERROR,
  bluetoothError: () => ({ type: BLUETOOTH_ERROR }),

  BLUETOOTH_SUCCESS,
  bluetoothSuccess: () => ({ type: BLUETOOTH_SUCCESS }),

  DELETE_BODIES,
  deleteBodies: bodyIds => ({ type: DELETE_BODIES, bodyIds }),
  
  LOAD_AUDIOFILE,
  loadAudioFile: (files, padIndex) => {
    return (dispatch, getState, getActions) => {
      const file = files[0];
      const { name, size, type } = file;
      if (type.indexOf('audio') === -1) {
        showDialog(
          'No audio file', 
          `This file wasn't recognised as an audio file.`,
          'Ok');
      } else if (size > 1000000) {
        showDialog(
          'File too big', 
          `Files up to 1 MB are allowed.`,
          'Ok');
      } else {
        const fileReader = new FileReader();

        fileReader.onload = e => {
          
          // convert arrayBuffer to string
          // @see https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
          const buffer = String.fromCharCode.apply(null, new Uint8Array(e.target.result));
          
          dispatch({
            type: LOAD_AUDIOFILE,
            buffer,
            name,
            padIndex,
          });
        };

        fileReader.readAsArrayBuffer(file);
      }
    };
  },
  
  NEW_PROJECT,
  newProject: () => ({ type: NEW_PROJECT, }),

  PLAY_NOTE,
  playNote: (command, channel, pitch, velocity) => {
    return (dispatch, getState, getActions) => {
      const { pads, visibleWidth, visibleHeight, } = getState();
      const index = pitches.indexOf(pitch);

      if (index === -1) {
        return;
      }

      return {
        type: PLAY_NOTE,
        command,
        index,
        velocity,
      };
    };
  },

  POPULATE,
  populate: () => ({ type: POPULATE }),

  RESIZE,
  resize: (visibleWidth, visibleHeight) => ({ type: RESIZE, visibleWidth, visibleHeight }),

  SELECT_MIDI_INPUT,
  selectMIDIInput: name => ({ type: SELECT_MIDI_INPUT, name, }),

  SELECT_SOUND,
  selectSound: index => ({ type: SELECT_SOUND, index, }),

  SET_AUDIO_OFFSET,
  setAudioOffset: value => ({ type: SET_AUDIO_OFFSET, value, }),

  SET_MIDI_ACCESSIBLE,
  setMidiAccessible: value => ({ type: SET_MIDI_ACCESSIBLE, value }),
  
  SET_PROJECT,
  setProject: state => ({ type: SET_PROJECT, state }),

  SET_WAVEFORM_POSITION,
  setWaveformPosition: firstWaveformSample => ({ type: SET_WAVEFORM_POSITION, firstWaveformSample }),

  SET_WAVEFORM_ZOOM,
  setWaveformZoom: (firstWaveformSample, numWaveformSamples) => ({ type: SET_WAVEFORM_ZOOM, firstWaveformSample, numWaveformSamples }),

  TOGGLE_SETTINGS,
  toggleSettings: value => ({ type: TOGGLE_SETTINGS, value }),

  UPDATE_MIDI_PORTS,
  updateMIDIPorts: (portNames, portType) => ({ type: UPDATE_MIDI_PORTS, portNames, portType, }),
};
