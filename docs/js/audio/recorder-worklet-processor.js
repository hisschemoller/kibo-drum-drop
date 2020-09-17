/**
 * Record audio to be stored elsewhere.
 * 
 * Only the first channel of the first input is recorded. 
 * So the left channel of a stereo input.
 */

class RecorderWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferTreshold = 11025; // 22050;
    this.isRecording = false;
    this.port.onmessage = e => {
      switch (e.data) {
        case 'startRecording':
          this.buffer.length = 0;
          this.isRecording = true;
          break;
        case 'stopRecording':
          this.isRecording = false;
          break;
      }
    };
  }

  /**
   * Process arrays of audio samples.
   * @param {*} inputs 
   * @param {*} outputs 
   * @param {*} parameters 
   */
  process(inputs, outputs, parameters) {
    if (this.isRecording && inputs && inputs[0].length) {
      const channel = inputs[0][0];
      const numSamples = channel.length;
      for (let i = 0; i < numSamples; i++) {
        this.buffer.push(channel[i]);
      }
      if (this.buffer.length > this.bufferTreshold) {
        this.port.postMessage(this.buffer);
        this.buffer.length = 0;
      }
    }
    return true;
  }
}

registerProcessor('recorder-worklet-processor', RecorderWorkletProcessor);
