
const initialState = {
  isMIDIAccessible: false,
  isRecordArmed: false,
  isRecording: false,
  isSettingsVisible: false,
  midiInputs: [],
  midiOutputs: [],
  midiSelectedInput: null,
  note: {
    id: null,
    index: 0,
    velocity: 0,
  },
  pads: [null, null, null, null, null, null, null, null, ],
  selectedIndex: -1,
};

/**
 * 
 * @param {Object} state 
 * @param {Object} action 
 * @param {String} action.type
 */
export default function reduce(state = initialState, action, actions = {}) {
  switch (action.type) {

    case actions.AUDIOFILE_DECODED: {
      const { index: loadedIndex, maxAmplitude, numSamples, } = action;
      const { pads, } = state;
      return { 
        ...state,
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === loadedIndex) {
            return [ ...accumulator, { 
              ...pad,
              maxAmplitude,
              numSamples,
              numWaveformSamples: pad.numWaveformSamples ? pad.numWaveformSamples : numSamples,
            } ];
          }
          return [ ...accumulator, pad ];
        }, []),
      };
    }

    case actions.LOAD_AUDIOFILE: {
      const { buffer, name, padIndex, } = action;
      const { pads, } = state;
      return { 
        ...state,
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === padIndex) {
            return [ ...accumulator, { 
              buffer, 
              maxAmplitude: 0,
              name,
              numSamples: 0,
              startOffset: 0,
              firstWaveformSample: 0,
              numWaveformSamples: 0,
            } ];
          }
          return [ ...accumulator, pad ];
        }, []),
        selectedIndex: padIndex,
      };
    }

    case actions.NEW_PROJECT: {
      const { isMIDIAccessible, midiInputs = [], midiOutputs = [], } = state;
      return { 
        ...initialState,
        isMIDIAccessible,
        midiInputs, 
        midiOutputs,
        pads: [null, null, null, null, null, null, null, null, ],
      };
    }

    case actions.PLAY_NOTE: {
      const { command, index, velocity } = action;
      return { 
        ...state,
        note: {
          command,
          index,
          velocity,
        },
      };
    }

    case actions.RECORD_AUDIOSTREAM: {
      const { buffer, name } = action;
      const { pads, selectedIndex } = state;
      return { 
        ...state,
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === selectedIndex) {
            return [ ...accumulator, { 
              buffer, 
              maxAmplitude: 0,
              name,
              numSamples: 0,
              startOffset: 0,
              firstWaveformSample: 0,
              numWaveformSamples: 0,
            } ];
          }
          return [ ...accumulator, pad ];
        }, []),
      };
    }

    case actions.RELOAD_AUDIOFILE_ON_SAME_PAD: {
      const { padIndex, } = action;
      const { pads, } = state;
      return { 
        ...state,
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === padIndex) {
            return [ ...accumulator, { 
              ...pad,
              startOffset: 0,
              firstWaveformSample: 0,
              numWaveformSamples: pad.numSamples,
            } ];
          }
          return [ ...accumulator, pad ];
        }, []),
        selectedIndex: padIndex,
      };
    }

    case actions.SELECT_MIDI_INPUT: {
      return { ...state, midiSelectedInput: action.name, };
    }

    case actions.SELECT_SOUND: {
      return { ...state, selectedIndex: action.index, };
    }

    case actions.SET_MIDI_ACCESSIBLE: {
      const { value } = action;
      return { ...state, isMIDIAccessible: value };
    }

    case actions.SET_WAVEFORM_POSITION: {
      const { firstWaveformSample } = action;
      const { pads, selectedIndex, } = state;
      return { 
        ...state,
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === selectedIndex) {
            return [ ...accumulator, { ...pad, firstWaveformSample, } ];
          }
          return [ ...accumulator, pad ];
        }, []),
      };
    }

    case actions.SET_WAVEFORM_ZOOM: {
      const { firstWaveformSample, numWaveformSamples } = action;
      const { pads, selectedIndex, } = state;
      return { 
        ...state,
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === selectedIndex) {
            return [ ...accumulator, { ...pad, firstWaveformSample, numWaveformSamples, } ];
          }
          return [ ...accumulator, pad ];
        }, []),
      };
    }

    case actions.SET_PROJECT: {
      const { isMIDIAccessible, midiInputs = [], midiOutputs = [], } = state;
      return { 
        ...initialState,
        ...state, 
        ...action.state,
        isMIDIAccessible, 
        isRecordArmed: false,
        isRecording: false,
        midiInputs, 
        midiOutputs,
      };
    }

    case actions.SET_SAMPLE_START_OFFSET: {
      const { startOffset } = action;
      const { pads, selectedIndex } = state;
      return { 
        ...state, 
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === selectedIndex) {
            return [ ...accumulator, { ...pad, startOffset, } ];
          }
          return [ ...accumulator, pad ];
        }, []), 
      };
    }

    case actions.TOGGLE_RECORDING: {
      const { isRecording } = action;
      return { ...state, isRecording };
    }

    case actions.TOGGLE_RECORD_ARM: {
      return { ...state, isRecordArmed: !state.isRecordArmed, };
    }

    case actions.TOGGLE_SETTINGS: {
      const { value } = action;
      return { ...state, isSettingsVisible: value };
    }

    case actions.UPDATE_MIDI_PORTS: {
      const { portNames, portType, } = action;
      const { midiInputs = [], midiOutputs = [], } = state;
      return {
        ...state,
        midiInputs: portType === 'input' ? [ ...portNames ] : midiInputs,
        midiOutputs: portType === 'output' ? [ ...portNames ] : midiOutputs,
      };
    }

    default:
      return state ? state : initialState;
  }
}
