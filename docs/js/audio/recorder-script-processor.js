import { getAudioContext } from './audio.js';

export function createRecorderScriptProcessor() {
  const audioCtx = getAudioContext();
  const buffer = [];
  const inputLevelTreshold = 0.2;
  let  bufferTreshold;
  let sampleRate;
  let isRecording = false;
  let isInputLevel = false;


  const processor = audioCtx.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = function(audioProcessingEvent) {
    const channel = audioProcessingEvent.inputBuffer.getChannelData(0);
    const numSamples = channel.length;
    let firstSampleToCapture = 0;

    // check for input level to start recording
    if (isRecording && !isInputLevel) {
      for (let i = 0; i < numSamples; i++) {
        if (Math.abs(channel[i]) >= inputLevelTreshold && !isInputLevel) {
          isInputLevel = true;
          firstSampleToCapture = i;
          this.port.onmessage('startCapturing');
        }
      }
    }

    // record the input
    if (isInputLevel) {
      for (let i = firstSampleToCapture; i < numSamples; i++) {
        buffer.push(channel[i]);
      }

      if (buffer.length > bufferTreshold) {
        this.port.onmessage(buffer);
        buffer.length = 0;
      }
    }
  }

  processor.port = {

    // receive message
    postMessage: (data) => {
      switch (data) {

        case 'startRecording':
          buffer.length = 0;
          isRecording = true;
          isInputLevel = false;
          break;
        
        case 'stopRecording':
          isRecording = false;
          isInputLevel = false;
          break;

        default:
          if (data.sampleRate) {
            sampleRate = data.sampleRate;
            bufferTreshold = sampleRate / 4;
          }
          break;
      }
    },
  };

  return processor;
}
