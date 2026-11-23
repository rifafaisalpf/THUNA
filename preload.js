
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('thuna', {
    appName: 'THUNA',
    platform: process.platform
});

