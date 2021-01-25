/**
 * Record audio to be stored elsewhere.
 * 
 * Only the first channel of the first input is recorded. 
 * So the left channel of a stereo input.
 */

class RecorderWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate;
    this.buffer = [];
    this.bufferTreshold;
    this.inputLevelTreshold = 0.2;
    this.isRecording = false;
    this.isInputLevel = false;
    this.port.onmessage = e => {
      switch (e.data) {

        case 'startRecording':
          this.buffer.length = 0;
          this.isRecording = true;
          this.isInputLevel = false;
          break;
        
        case 'stopRecording':
          this.isRecording = false;
          break;

        default:
          if (e.data.sampleRate) {
            this.sampleRate = e.data.sampleRate;
            this.bufferTreshold = this.sampleRate / 4;
          }
          break;
      }
    };
  }

  /**
   * Process arrays of audio samples.
   * @param {Array} inputs 
   * @param {Array} outputs 
   * @param {Array} parameters 
   * @returns {Boolean} True to keep the processor alive.
   */
  process(inputs, outputs, parameters) {
    if (this.isRecording && inputs && inputs[0].length) {
      const channel = inputs[0][0];
      const numSamples = channel.length;

      // check for input level to start recording
      if (!this.isInputLevel) {
        for (let i = 0; i < numSamples; i++) {
          if (Math.abs(channel[i]) >= this.inputLevelTreshold && !this.isInputLevel) {
            this.isInputLevel = true;
            this.port.postMessage('startCapturing');
          }
        }
      }

      // record the input
      if (this.isInputLevel) {
        for (let i = 0; i < numSamples; i++) {
          this.buffer.push(channel[i]);
        }

        if (this.buffer.length > this.bufferTreshold) {
          this.port.postMessage(this.buffer);
          this.buffer.length = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('recorder-worklet-processor', RecorderWorkletProcessor);
