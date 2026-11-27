'use strict';

const assert = require('node:assert/strict');
const simulator = require('./recognition/sensorSimulator');
const sensorProcessor = require('./recognition/sensorProcessor');
const gestureRecorder = require('./recognition/gestureRecorder');
const classifier = require('./recognition/classifier');

function makeFrame(timestamp, motion, pitch = 0, yaw = 0, roll = 0) {
    return { timestamp, motion, pitch, yaw, roll };
}

function feed(recorder, from, to, motion, pitchAt = () => 0) {
    for (let timestamp = from; timestamp <= to; timestamp += 20) {
        recorder.processFrame(makeFrame(timestamp, motion, pitchAt(timestamp)));
    }
}

function armRecorder(recorder) {
    feed(recorder, 0, 800, 0);
    assert.equal(recorder.getState().status, 'READY');
}

function runSimulatedGesture(gesture) {
    const sim = simulator.createSensorSimulator({ noise: false });
    const processor = sensorProcessor.createSensorProcessor();
    const recorder = gestureRecorder.createGestureRecorder();
    const gestureClassifier = classifier.createClassifier();
    const results = [];

    processor.startCalibration(50);
    const calibrationSamples = sim.generateSequenceSamples('IDLE', {
        preStillMs: 1000,
        activeMs: 0,
        postStillMs: 0,
        startTimestamp: 0
    });
    calibrationSamples.forEach((sample) => processor.processSample(sample));

    recorder.onRecordingComplete((recording) => {
        results.push(gestureClassifier.classifyRecording(recording));
    });

    const sequence = sim.generateSequenceSamples(gesture, {
        startTimestamp: 1020,
        preStillMs: 1000
    });
    sequence.forEach((sample) => {
        const frame = processor.processSample(sample);
        if (frame) recorder.processFrame(frame);
    });
    return results;
}

function testCooldownLifecycle() {
    const recorder = gestureRecorder.createGestureRecorder();
    armRecorder(recorder);
    feed(recorder, 820, 1400, 40, (timestamp) => 20 * Math.sin(timestamp / 100));
    feed(recorder, 1420, 2800, 0);
    assert.equal(recorder.getState().status, 'HOLD_STILL', 'cooldown should report HOLD_STILL');
    feed(recorder, 2820, 2840, 0);
    assert.equal(recorder.getState().status, 'READY', 'recorder should return to READY after cooldown');
}

function testShortMovementRejected() {
    const recorder = gestureRecorder.createGestureRecorder();
    let recordings = 0;
    let ignored = null;
    recorder.onRecordingComplete(() => { recordings += 1; });
    recorder.onIgnored((event) => { ignored = event; });
    armRecorder(recorder);
    feed(recorder, 820, 1100, 40);
    feed(recorder, 1120, 2100, 0);
    assert.equal(recordings, 0, 'movement shorter than 400 ms must not be recorded');
    assert.ok(ignored, 'short movement should be reported as ignored');
    assert.ok(ignored.durationMs < 400);
}

function testContinuousMovementCannotRestart() {
    const recorder = gestureRecorder.createGestureRecorder();
    const recordingEntries = [];
    recorder.onStatusChange((event) => {
        if (event.status === 'RECORDING') recordingEntries.push(event.timestamp);
    });
    armRecorder(recorder);
    feed(recorder, 820, 12000, 40);
    assert.equal(recordingEntries.length, 1, 'one continuous movement must create only one recording');
}

function testSimulatedClassification() {
    for (const [profile, message] of [
        ['YES', 'YES'],
        ['NO', 'NO'],
        ['FOOD', 'I NEED FOOD']
    ]) {
        const results = runSimulatedGesture(profile);
        assert.equal(results.length, 1, `${profile} should produce one recording`);
        assert.equal(results[0].recognized, true, `${profile} should be recognized`);
        assert.equal(results[0].message, message, `${profile} should preserve its exact output`);
    }

    const unclearResults = runSimulatedGesture('UNCLEAR');
    assert.equal(unclearResults.length, 1, 'unclear movement should produce one recording');
    assert.equal(unclearResults[0].recognized, false, 'unclear movement must be rejected');
}

testCooldownLifecycle();
testShortMovementRejected();
testContinuousMovementCannotRestart();
testSimulatedClassification();
console.log('Phase 5 recognition checks passed.');
