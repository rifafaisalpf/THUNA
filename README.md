# THUNA
### Every gesture deserves to be heard.

**THUNA** is a gesture-based assistive communication system designed to help people communicate through simple wrist movements.

The project uses an ESP32 and an MPU6050 motion sensor to capture wrist movements. The sensor data is transmitted to a Windows desktop application, where gesture recognition and command processing take place using JavaScript.

Our goal is to develop an accessible and easy-to-use communication interface that translates recognized gestures into meaningful outputs.

## Features

- **Motion Tracking:** Captures accelerometer and gyroscope data using the MPU6050.
- **Gesture Recognition:** Processes motion data to identify predefined wrist gestures.
- **Desktop Application:** A Windows desktop interface built with Electron.
- **Text Output:** Converts recognized gestures into corresponding text.
- **Voice Output:** Designed to provide spoken output using text-to-speech.
- **Modular Architecture:** Separates sensor data collection, gesture recognition and user interface functionality.

## Technology Stack

| Component | Technology |
|---|---|
| Desktop Application | Electron |
| Frontend | HTML, CSS, JavaScript |
| Gesture Recognition | JavaScript |
| Microcontroller | ESP32 |
| Motion Sensor | MPU6050 |
| Development Environment | Arduino IDE, VS Code |

## System Architecture

1. The MPU6050 captures wrist movement.
2. The ESP32 reads accelerometer and gyroscope values.
3. Sensor data is transmitted to the Electron desktop application.
4. JavaScript processes the incoming data and identifies gestures.
5. The application displays the corresponding text and provides voice output.

## Project Structure

```text
THUNA/
│
├── recognition/
│   ├── classifier.js
│   └── sensorSimulator.js
│
├── index.html
├── style.css
├── script.js
├── main.js
├── preload.js
├── package.json
└── README.md
```

## Current Development Status

THUNA is currently under active development.

- [x] Initial Electron desktop application structure
- [x] Basic user interface
- [x] Initial sensor simulation module
- [ ] ESP32 sensor data integration
- [ ] Finalize gesture movements and definitions
- [ ] Implement JavaScript-based gesture recognition
- [ ] Connect recognized gestures to text output
- [ ] Integrate text-to-speech
- [ ] Test with actual hardware

## Project Goal

To make everyday communication more accessible by transforming simple gestures into understandable messages.

---

**THUNA — Every gesture deserves to be heard.**
