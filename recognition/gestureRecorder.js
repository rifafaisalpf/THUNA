(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.thunaGestureRecorder = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const RECORDER_STATUS = {
        STOPPED: 'STOPPED',
        HOLD_STILL: 'HOLD_STILL',
        READY: 'READY',
        RECORDING: 'RECORDING'
    };

    const DEFAULT_RECORDER_CONFIG = {
        START_DPS: 30.0,         // Motion level that starts a gesture
        STILL_DPS: 18.0,         // Below this counts as "still"
        PRE_STILL_MS: 800,       // Hold still this long first ("Ready")
        IDLE_MS: 900,            // Stillness duration that ends a gesture
        MIN_GESTURE_MS: 400,     // Minimum active duration to classify
        MAX_GESTURE_MS: 10000,   // Maximum gesture duration
        COOLDOWN_MS: 500,        // Post-gesture cooldown
        MAX_SAMPLES: 500,        // 10 s at 50 Hz
        PRE_ROLL_SAMPLES: 15,    // 0.3 s pre-roll at 50 Hz
        MIN_SAMPLE_INTERVAL_MS: 15 // Guard against >66 Hz bursts while keeping 50 Hz (~20 ms) samples
    };

    /**
     * Create a GestureRecorder that detects gesture start/end from
     * SensorProcessor frames using the Arduino reference state machine.
     * @param {object} [userConfig]
     */
    function createGestureRecorder(userConfig) {
        const cfg = Object.assign({}, DEFAULT_RECORDER_CONFIG, userConfig || {});

        let enabled = true;
        let gState = 'IDLE'; // 'IDLE' | 'ACTIVE'
        let isStill = false;
        let armed = false;
        let stillStartMs = 0;
        let gStartMs = 0;
        let lastMoveMs = 0;
        let lastSampleMs = -Infinity;
        let cooldownUntil = 0;

        let samples = [];
        let preBuffer = [];
        let lastEmittedStatus = null;

        const recordingListeners = new Set();
        const ignoredListeners = new Set();
        const statusListeners = new Set();

        function emitBrowserEvent(name, detail) {
            if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent(name, { detail }));
            }
        }

        function computeStatus(nowMs) {
            if (!enabled) return RECORDER_STATUS.STOPPED;
            if (gState === 'ACTIVE') return RECORDER_STATUS.RECORDING;
            if (armed && (cooldownUntil === 0 || nowMs > cooldownUntil)) {
                return RECORDER_STATUS.READY;
            }
            return RECORDER_STATUS.HOLD_STILL;
        }

        function notifyStatus(nowMs, force) {
            const next = computeStatus(nowMs);
            if (!force && next === lastEmittedStatus) return;
            lastEmittedStatus = next;
            const payload = {
                status: next,
                enabled,
                sampleCount: samples.length,
                timestamp: nowMs
            };
            statusListeners.forEach((fn) => fn(payload));
            emitBrowserEvent('thuna:gesture-status', payload);
        }

        function toRecorderPoint(frame) {
            return {
                roll: frame.roll,
                pitch: frame.pitch,
                yaw: frame.yaw,
                motion: frame.motion,
                timestamp: frame.timestamp
            };
        }

        function pushPre(point) {
            preBuffer.push(point);
            if (preBuffer.length > cfg.PRE_ROLL_SAMPLES) {
                preBuffer.shift();
            }
        }

        function startGestureBuffer() {
            samples = preBuffer.slice();
        }

        function addSample(point) {
            if (samples.length < cfg.MAX_SAMPLES) {
                samples.push(point);
            }
        }

        function reset() {
            gState = 'IDLE';
            isStill = false;
            armed = false;
            stillStartMs = 0;
            gStartMs = 0;
            lastMoveMs = 0;
            lastSampleMs = -Infinity;
            cooldownUntil = 0;
            samples = [];
            preBuffer = [];
            notifyStatus(0, true);
        }

        function setEnabled(nextEnabled) {
            enabled = Boolean(nextEnabled);
            if (!enabled) {
                gState = 'IDLE';
                isStill = false;
                armed = false;
                samples = [];
                preBuffer = [];
            }
            notifyStatus(Date.now(), true);
        }

        function processFrame(frame) {
            if (!enabled || !frame || typeof frame.timestamp !== 'number') {
                return null;
            }

            // Pause recording while user calibration is running
            if (frame.isCalibrating) {
                if (gState !== 'IDLE' || armed || preBuffer.length > 0) {
                    reset();
                }
                return null;
            }

            const now = frame.timestamp;
            const point = toRecorderPoint(frame);

            // Handle timestamp reset (e.g., ESP32 reboot)
            if (lastSampleMs !== -Infinity && now < lastSampleMs) {
                reset();
            }

            if (now - lastSampleMs >= cfg.MIN_SAMPLE_INTERVAL_MS) {
                lastSampleMs = now;
                if (gState === 'IDLE') {
                    pushPre(point);
                } else {
                    addSample(point);
                }
            }

            if (gState === 'IDLE') {
                if (frame.motion < cfg.STILL_DPS) {
                    if (!isStill) {
                        isStill = true;
                        stillStartMs = now;
                    }
                    armed = (now - stillStartMs) >= cfg.PRE_STILL_MS;
                } else {
                    isStill = false;
                    if (cooldownUntil !== 0 && now <= cooldownUntil) {
                        armed = false;
                    }
                }

                const cooldownPassed = cooldownUntil === 0 || now > cooldownUntil;
                if (armed && cooldownPassed && frame.motion > cfg.START_DPS) {
                    startGestureBuffer();
                    gState = 'ACTIVE';
                    gStartMs = now;
                    lastMoveMs = now;
                    armed = false;
                }

                notifyStatus(now, false);
                return null;
            }

            // gState === 'ACTIVE'
            if (frame.motion > cfg.STILL_DPS) {
                lastMoveMs = now;
            }

            const idleEnded = (now - lastMoveMs) > cfg.IDLE_MS;
            const maxTimeReached = (now - gStartMs) > cfg.MAX_GESTURE_MS;
            const maxSamplesReached = samples.length >= cfg.MAX_SAMPLES;

            if (idleEnded || maxTimeReached || maxSamplesReached) {
                const recordedSamples = samples;
                const activeDurationMs = lastMoveMs - gStartMs;
                const startMs = gStartMs;
                const endMs = lastMoveMs;

                gState = 'IDLE';
                cooldownUntil = now + cfg.COOLDOWN_MS;
                isStill = true;
                stillStartMs = lastMoveMs;
                armed = false;
                samples = [];

                notifyStatus(now, false);

                if (activeDurationMs >= cfg.MIN_GESTURE_MS) {
                    const recording = {
                        samples: recordedSamples,
                        startMs,
                        endMs,
                        durationMs: activeDurationMs,
                        timestamp: now
                    };
                    recordingListeners.forEach((fn) => fn(recording));
                    emitBrowserEvent('thuna:gesture-recorded', recording);
                    return recording;
                } else {
                    const ignored = {
                        reason: 'ignored: movement too short',
                        durationMs: activeDurationMs,
                        timestamp: now
                    };
                    ignoredListeners.forEach((fn) => fn(ignored));
                    emitBrowserEvent('thuna:gesture-ignored', ignored);
                    return null;
                }
            }

            notifyStatus(now, false);
            return null;
        }

        function onRecordingComplete(listener) {
            recordingListeners.add(listener);
            return () => recordingListeners.delete(listener);
        }

        function onIgnored(listener) {
            ignoredListeners.add(listener);
            return () => ignoredListeners.delete(listener);
        }

        function onStatusChange(listener) {
            statusListeners.add(listener);
            return () => statusListeners.delete(listener);
        }

        function getState() {
            return {
                enabled,
                state: gState,
                status: computeStatus(lastSampleMs === -Infinity ? 0 : lastSampleMs),
                armed,
                isStill,
                sampleCount: samples.length,
                config: Object.assign({}, cfg)
            };
        }

        return {
            RECORDER_STATUS,
            processFrame,
            reset,
            setEnabled,
            onRecordingComplete,
            onIgnored,
            onStatusChange,
            getState
        };
    }

    const defaultInstance = createGestureRecorder();

    if (typeof window !== 'undefined') {
        window.addEventListener('thuna:sensor-processed', (event) => {
            defaultInstance.processFrame(event.detail);
        });
    }

    return {
        RECORDER_STATUS,
        DEFAULT_RECORDER_CONFIG,
        createGestureRecorder,
        defaultRecorder: defaultInstance
    };
}));
