/**
 * Create a fairly unique ID.
 * @see https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 */
export function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

export const sampleRate = 44100;
export const maxRecordingLength = 2;
export const lowestOctave = 4;
export const numOctaves = 4;
export const pitches = [60, 62, 64, 65, 67, 69, 71, 72];
export const continuousControllers = [102, 103, 104, 105, 106, 107, 108, 109];
export const NUM_SAMPLES = sampleRate * maxRecordingLength;
