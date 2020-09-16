import { createUUID, lowestOctave, numOctaves, pitches } from '../utils/utils.js';
import { getAudioContext } from '../audio/audio.js';
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
const RECORD_AUDIOSTREAM = 'RECORD_AUDIOSTREAM';
const RELOAD_AUDIOFILE_ON_SAME_PAD = 'RELOAD_AUDIOFILE_ON_SAME_PAD';
const RESIZE = 'RESIZE';
const SELECT_MIDI_INPUT = 'SELECT_MIDI_INPUT';
const SELECT_SOUND = 'SELECT_SOUND';
const SET_MIDI_ACCESSIBLE = 'SET_MIDI_ACCESSIBLE';
const SET_SAMPLE_START_OFFSET = 'SET_SAMPLE_START_OFFSET';
const SET_WAVEFORM_POSITION = 'SET_WAVEFORM_POSITION';
const SET_WAVEFORM_ZOOM = 'SET_WAVEFORM_ZOOM';
const SET_PROJECT = 'SET_PROJECT';
const TOGGLE_RECORD_ARM = 'TOGGLE_RECORD_ARM';
const TOGGLE_RECORDING = 'TOGGLE_RECORDING';
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
  loadAudioFile: (files, index) => {
    return (dispatch, getState, getActions) => {
      const { pads, selectedIndex = 0 } = getState();
      const padIndex = isNaN(index) ? selectedIndex : index;
      const file = files[0];
      const { name, size, type } = file;
      const isSameFileOnSamePad = pads[padIndex] && pads[padIndex].name === name;

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
      } else if(isSameFileOnSamePad) {
        dispatch({
          type: RELOAD_AUDIOFILE_ON_SAME_PAD,
          padIndex,
        });
      } else {
        const fileReader = new FileReader();

        fileReader.onload = e => {
          
          // convert arrayBuffer to string
          // @see https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
          // const buffer = String.fromCharCode.apply(null, new Uint8Array(e.target.result));

          // File to AudioBuffer to ArrayBuffer
          getAudioContext().decodeAudioData(e.target.result).then(audioBuffer => {
            const float32Array = audioBuffer.getChannelData(0);
            const arrayBuffer = float32Array.buffer;

            // ArrayBuffer to String
            const uint8Array = new Uint8Array(arrayBuffer);
            let binaryStr = '';
            for (let i = 0, n = uint8Array.byteLength; i < n; i++) {
              binaryStr += String.fromCharCode(uint8Array[i]);
            }

            dispatch({
              type: LOAD_AUDIOFILE,
              buffer: binaryStr,
              name,
              padIndex,
            });
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

  RECORD_AUDIOSTREAM,
  recordAudioStream: binaryStr => {
    return (dispatch, getState, getActions) => {
      const { selectedIndex } = getState();
      return {
        type: RECORD_AUDIOSTREAM,
        buffer: binaryStr,
        name: `Recording ${selectedIndex}`,
      };
    };
  },

  RELOAD_AUDIOFILE_ON_SAME_PAD,

  RESIZE,
  resize: (visibleWidth, visibleHeight) => ({ type: RESIZE, visibleWidth, visibleHeight }),

  SELECT_MIDI_INPUT,
  selectMIDIInput: name => ({ type: SELECT_MIDI_INPUT, name, }),

  SELECT_SOUND,
  selectSound: index => ({ type: SELECT_SOUND, index, }),

  SET_MIDI_ACCESSIBLE,
  setMidiAccessible: value => ({ type: SET_MIDI_ACCESSIBLE, value }),
  
  SET_PROJECT,
  setProject: state => ({ type: SET_PROJECT, state }),

  SET_SAMPLE_START_OFFSET,
  setSampleStartOffset: startOffset =>  ({ type: SET_SAMPLE_START_OFFSET, startOffset }),

  SET_WAVEFORM_POSITION,
  setWaveformPosition: firstWaveformSample => ({ type: SET_WAVEFORM_POSITION, firstWaveformSample }),

  SET_WAVEFORM_ZOOM,
  setWaveformZoom: (firstWaveformSample, numWaveformSamples) => ({ type: SET_WAVEFORM_ZOOM, firstWaveformSample, numWaveformSamples }),

  TOGGLE_RECORD_ARM,
  toggleRecordArm: () => ({ type: TOGGLE_RECORD_ARM }),

  TOGGLE_RECORDING,
  toggleRecording: isRecording => {
    return (dispatch, getState, getActions) => {
      const { isRecordArmed, } = getState();
      if (isRecordArmed) {
        return { type: TOGGLE_RECORDING, isRecording };
      }
    };
  },

  TOGGLE_SETTINGS,
  toggleSettings: value => ({ type: TOGGLE_SETTINGS, value }),

  UPDATE_MIDI_PORTS,
  updateMIDIPorts: (portNames, portType) => ({ type: UPDATE_MIDI_PORTS, portNames, portType, }),
};
