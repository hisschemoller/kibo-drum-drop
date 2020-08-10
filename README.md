# Kibo Drum Drop

Demo: https://hisschemoller.github.io/kibo-drum-drop/

A small drum sample player as a web app. To use with the [Kodaly Kibo](https://www.kodaly.app/) or any other MIDI pad controller that generates MIDI notes.

* Connect with MIDI or Bluetooth.
* Play MIDI notes or computer keyboard keys 1 to 8.
* Drag samples from the desktop and drop on the pads on screen.
* Samples are stored in the browser's local storage, they remain playable even if the browser is closed and reopened, and even if the original audio files are deleted from the computer.

## Kodaly Kibo

This app is especially made to work with the [Kodaly Kibo](https://www.kodaly.app/). Therefore it only listens to the eight MIDI note pitches the Kibo controller generates: 60, 62, 64, 65, 67, 69, 71 and 72.
