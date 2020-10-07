import { continuousControllers, createUUID, lowestOctave, numOctaves, pitches, sampleRate } from '../utils/utils.js';
import { getAudioContext } from '../audio/audio.js';
import { showDialog } from '../view/dialog.js';
import { NOTE_OFF, NOTE_ON, POLY_KEY_PRESSURE, CONTROL_CHANGE } from '../midi/midi.js';

const AUDIOFILE_DECODED = 'AUDIOFILE_DECODED';
const BLUETOOTH_CONNECT = 'BLUETOOTH_CONNECT';
const BLUETOOTH_DISCONNECT = 'BLUETOOTH_DISCONNECT';
const BLUETOOTH_ERROR = 'BLUETOOTH_ERROR';
const BLUETOOTH_SUCCESS = 'BLUETOOTH_SUCCESS';
const DELETE_BODIES = 'DELETE_BODIES';
const HANDLE_MIDI_MESSAGE = 'HANDLE_MIDI_MESSAGE';
const LOAD_AUDIOFILE = 'LOAD_AUDIOFILE';
const NEW_PROJECT = 'NEW_PROJECT';
const POPULATE = 'POPULATE';
const RECORD_AUDIOSTREAM = 'RECORD_AUDIOSTREAM';
const RECORD_ERASE = 'RECORD_ERASE';
const RECORD_START = 'RECORD_START';
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
      } else if (size > 10000000) {
        showDialog(
          'File too big', 
          `Files up to 1 MB are allowed.`,
          'Ok');
      } else if(isSameFileOnSamePad) {
        dispatch({ type: RELOAD_AUDIOFILE_ON_SAME_PAD, padIndex, });
      } else {
        const fileReader = new FileReader();

        fileReader.onload = e => {

          // File to AudioBuffer to ArrayBuffer
          getAudioContext().decodeAudioData(e.target.result).then(audioBuffer => {
            const float32Array = audioBuffer.getChannelData(0);
            const arrayBuffer = float32Array.buffer;

            // convert Float32Array to Int16Array
            const audioMaxLength = sampleRate * 4;
            const int16Array = new Int16Array(audioMaxLength);
            for (let i = 0, n = int16Array.length; i < n; i++) {
              const sample = i < float32Array.length ? Math.max(-1, Math.min(float32Array[i], 1)) : 0;
              int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }

            // Int16Array to String
            const uint8Array = new Uint8Array(int16Array.buffer);
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

  HANDLE_MIDI_MESSAGE,
  handleMIDIMessage: (command, channel, data0, data1) => {
    return (dispatch, getState, getActions) => {
      const { pads, visibleWidth, visibleHeight, } = getState();
      const index = pitches.indexOf(data0);

      switch (command) {
        case NOTE_OFF:
          // console.log('NOTE_OFF pad', index, ', velocity', data1);
          if (index !== -1) {
            const velocity = data1;
            return { type: HANDLE_MIDI_MESSAGE, command, index, velocity, };
          }
          break;
        
        case NOTE_ON:
          // console.log('NOTE_ON pad', index, ', velocity', data1);
          if (index !== -1) {
            const velocity = data1;
            return { type: HANDLE_MIDI_MESSAGE, command, index, velocity, };
          }
          break;
      
        case POLY_KEY_PRESSURE:
          // console.log('POLY_KEY_PRESSURE pad', index, ', value ', data1);
          break;

        case CONTROL_CHANGE:
          switch (data0) {
            case 117:
              console.log('knob turn, value ', data1);
              break;

            case 118:
              console.log('knob double click, value ', data1);
              break;

            case 119:
              // console.log('knob click, value ', data1);
              if (data1 === 127) {
                dispatch(getActions().toggleRecordArm());
              }
              break;

            default:
              const padIndex = continuousControllers.indexOf(data0);
              if (padIndex !== -1) {
                if (data1 === 127) {
                  // console.log('shape enter, index ', padIndex);
                  dispatch(getActions().toggleRecording(true, padIndex));
                } else {
                  // console.log('shape remove, index ', padIndex);
                  dispatch(getActions().recordErase(padIndex));
                }
              }
          }
          break;
      }
    };
  },

  POPULATE,
  populate: () => ({ type: POPULATE }),

  RECORD_AUDIOSTREAM,
  recordAudioStream: binaryStr => {
    return (dispatch, getState, getActions) => {
      const { recordingIndex } = getState();
      return {
        type: RECORD_AUDIOSTREAM,
        buffer: binaryStr,
        name: `Recording ${recordingIndex}`,
      };
    };
  },

  RECORD_ERASE,
  recordErase: padIndex => {
    return (dispatch, getState, getActions) => {
      const { isRecordArmed, pads, selectedIndex, } = getState();
      if (isRecordArmed) {
        const isValidPadIndex = !isNaN(padIndex) && padIndex >= 0 && padIndex < pads.length;
        const index = isValidPadIndex ? padIndex : selectedIndex;
        return { type: RECORD_ERASE, index };
      }
    };
  },

  RECORD_START,
  recordStart: () => ({ type: RECORD_START }),

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
  toggleRecording: (isRecording, padIndex) => {
    return (dispatch, getState, getActions) => {
      const { isRecordArmed, pads, selectedIndex, } = getState();
      if (isRecordArmed) {
        const isValidPadIndex = !isNaN(padIndex) && padIndex >= 0 && padIndex < pads.length;
        const index = isValidPadIndex ? padIndex : selectedIndex;
        return { type: TOGGLE_RECORDING, isRecording, index };
      }
    };
  },

  TOGGLE_SETTINGS,
  toggleSettings: value => ({ type: TOGGLE_SETTINGS, value }),

  UPDATE_MIDI_PORTS,
  updateMIDIPorts: (portNames, portType) => ({ type: UPDATE_MIDI_PORTS, portNames, portType, }),
};
