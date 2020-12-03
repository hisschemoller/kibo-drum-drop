# Kibo Fono

A web app to record your microphone and play the recorded sounds musically.

Demo: https://hisschemoller.github.io/kibo-fono/

## The Kibo Fono app

![App overview](assets/img/kibo-fono-overview.jpg 'App overview')

Kibo Fono runs in your browser. It lets you record eight sounds with the microphone in your computer or mobile device. You can then play back the sounds with the Kodaly Kibo or another MIDI controller, creating rhythms and musical patterns.

## Kodaly Kibo

![Kodaly Kibo](assets/img/kibo-bb-prospettiva.png 'Kodaly Kibo')

This app is especially made to work with the [Kodaly Kibo](https://www.kodaly.app/). The Kibo is a MIDI controller with eight wooden shapes that can be played like drum pads or piano keys. MIDI transmits wireless over Bluetooth LE or over USB cable.

This document assumes you're using the app with a Kibo. There's a paragraph below however that explains how to use Kibo Fono with other MIDI controllers or on its own without a controller.

## How to use the app with a Kibo

![App startup](assets/img/kibo-fono-startup.jpg 'App startup')

Switch on the Kibo and connect it via Bluetooth or USB MIDI. This can be done in the Settings panel in the app, which appears when the app first loads or by clicking the cog icon in the top right of the app.

![Record mode](assets/img/kibo-fono-record-mode.jpg 'Record mode')

The app has two modes: Record and Playback. Playback mode prevents you from accidentally erasing recordings.

Switch between record and playback mode by clicking the metal knob on the Kibo, or by clicking the microphone button in the app.

### To record a sound:

* Make sure the app is in record mode.
* Enter a shape in the Kibo (first remove the shape if it was already in).
* The app now starts to listen for sounds.
* When the app detects sound it will start to record. It can record a maximum of 4 seconds per shape.
* After recording ends you can tap the shape on the Kibo to listen to the recording.

### To erase a sound:

* Make sure the app is in record mode.
* Remove a shape from the Kibo to clear the recording in that slot.

### To play a sound:

* Tap a shape on the Kibo to play a sound. The softer you tap the lower the volume.

## Use the app with another MIDI controller

Connect your controller via Bluetooth or USB MIDI using the app's Settings panel.

### MIDI implementation

* MIDI note pitches 60, 62, 64, 65, 67, 69, 71 and 72 play the eight sound slots.
* MIDI CC 119 with value 127 toggles 'record mode' on and off.
* MIDI CC 102, 103, 104, 105, 106, 107, 108 and 109 with value:
  * 127 starts recording in the eight sound slots.
  * below 127 stops recording in the sound slot.

## Use the app on its own

The Settings panel can be ignored and closed.

### To record a sound:

* Put the app in record mode by clicking the round microphone button.
* Click and hold one of the eight sound slots.
* The app now starts to listen for sounds.
* When the app detects sound it will start to record. It can record a maximum of 4 seconds per shape.
* After recording ends you can tap the computer keyboard's 1 to 8 number keys to listen to the recording.

### To erase a sound:

* Individual sounds can't be erased from the app. 
* You can however do a full reset by holding the 'r', 's' and 't' (for 'reset') computer keyboard keys at the same time, then let go and refresh the browser. This clears any data.

### To play a sound:

* Tap the computer keyboard's 1 to 8 number keys to play the eight sound slots.

## Drag and drop audio files

## App settings

![Settings panel](assets/img/kibo-keyboard-settings.gif 'Settings panel')

The settings panel shows when the app starts. It can be recalled by clicking the cogwheel icon in the top right corner of the screen.

It has two settings:

1. Bluetooth - Click 'Connect' to connect to a Bluetooth LE device that transmits MIDI over Bluetooth.
2. MIDI - Select a MIDI input from the dropdown.

## Supported browsers

Chrome is currently the only browser that can run the app. The desktop as well as the mobile Android version of Chrome.

Browsers have to implement the Javascript Web Bluetooth or Web MIDI API to run the app. Because these are required to connect through MIDI or Bluetooth.


## Etc.

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

