
const initialState = {
  isMIDIAccessible: false,
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

    case actions.LOAD_AUDIOFILE: {
      const { buffer, name, padIndex, } = action;
      const { pads, } = state;
      return { 
        ...state,
        pads: pads.reduce((accumulator, pad, index) => {
          if (index === padIndex) {
            return [ ...accumulator, { buffer, name, } ];
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

    case actions.SELECT_MIDI_INPUT: {
      return { ...state, midiSelectedInput: action.name, };
    }

    case actions.SET_MIDI_ACCESSIBLE: {
      const { value } = action;
      return { ...state, isMIDIAccessible: value };
    }

    case actions.SET_PROJECT: {
      const { isMIDIAccessible, midiInputs = [], midiOutputs = [], } = state;
      return { 
        ...initialState,
        ...state, 
        ...action.state,
        isMIDIAccessible, 
        midiInputs, 
        midiOutputs,
      };
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
