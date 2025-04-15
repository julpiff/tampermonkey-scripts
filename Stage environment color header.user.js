// ==UserScript==
// @name         Stage environment color header
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Style the header and primary button on the staging environment
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Stage%20environment%20color%20header.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Stage%20environment%20color%20header.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Check the URL and apply the styles if on the staging environment
    if (window.location.href.startsWith('https://mad-stage.ingrid.com/')) {
        const style = document.createElement('style');
        style.innerHTML = `
            .ant-layout-header.ffft294 {
                background-color: rgb(145, 201, 192) !important; /* Muted Blue */
            }
            .ant-btn.ant-btn-primary.fnxduv9 {
                background-color: rgb(145, 201, 192) !important; /* Muted Blue */
            }
        `;
        document.head.appendChild(style);
    }
})();
