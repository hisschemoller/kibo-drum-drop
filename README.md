# Kibo Fono

Demo: https://hisschemoller.github.io/kibo-fono/

A small sample recorder and player as a web app. To use with the [Kodaly Kibo](https://www.kodaly.app/) or any other MIDI pad controller that generates MIDI notes.

* Connect with MIDI or Bluetooth.
* Play MIDI notes or computer keyboard keys 1 to 8.
* Drag samples from the desktop and drop them on the pads on screen. One per pad.
* Samples are stored in the browser's local storage, they remain playable even if the browser is closed and reopened, and even if the original audio files are deleted from the computer.
* Maximum size is 1MB per audio file to ensure they can be stored.

## Microphone recording

https://developers.google.com/web/fundamentals/media/recording-audio
https://github.com/esonderegger/web-audio-peak-meter/blob/master/index.js

## Waveform display

The waveform display shows the audio waveform of the currently selected pad.

* Drag up or down in the waveform display to zoom in or out.
* Drag left or right in the waveform display to reposition the visible part of the waveform.
* Drag the vertical pointer by the circle handle to change the audio playback start position.

## Kodaly Kibo

This app is especially made to work with the [Kodaly Kibo](https://www.kodaly.app/). Therefore it only listens to the eight MIDI note pitches the Kibo controller generates: 60, 62, 64, 65, 67, 69, 71 and 72.

## Audio files

When dropped from the filesystem:

* DataTransfer has a FileList containing a File (kind of Blob with extra information properties).
* FileReader.readAsArrayBuffer reads the File into an ArrayBuffer.
* The ArrayBuffer is cast to Uint8Array.
* String.fromCharCode converts the Uint8Array into a string. Which is stored in the state.

When recorded:

* MediaDevices.getUserMedia produces a MediaStream object.
* AudioContext.createMediaStreamSource creates a MediaStreamAudioSourceNode for the stream.
* The MediaStreamAudioSourceNode is conneted to a custom AudioWorkletNode.
* AudioWorkletProcessor.process fills a regular Array with Numbers, valued from -1 to 1.

