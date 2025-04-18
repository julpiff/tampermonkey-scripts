// ==UserScript==
// @name         Ingrid Debug Button
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adds and manages a debug button and session ID display for Ingrid sessions, and removes them if the shipwallet-container is missing.
// @author       You
// @exclude      https://debug.ingrid.com/*
// @match        *://*/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Ingrid%20Debug%20Button.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Ingrid%20Debug%20Button.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Determine if we're on one of the mad sites.
    const isMadSite = window.location.href.startsWith('https://mad-stage.ingrid.com/') ||
                      window.location.href.startsWith('https://mad.ingrid.com/');

    // Global variables for session management.
    let currentSessionId = null;
    let closedSessionId = null; // New variable to store closed session id.
    let iframeObserver = null;
    let observer = null;

    const SESSION_ID_DISPLAY_ID = 'ingrid-session-id';
    const DEBUG_BUTTON_ID = 'ingrid-debug-button';
    const WIDGET_IFRAME_ID = 'ingrid-widget-iframe';

    // Remove debug elements and record the closed session ID.
    function removeDebugElements() {
        const sessionIdDisplay = document.getElementById(SESSION_ID_DISPLAY_ID);
        if (sessionIdDisplay) {
            sessionIdDisplay.remove();
        }
        const debugButton = document.getElementById(DEBUG_BUTTON_ID);
        if (debugButton) {
            debugButton.remove();
        }
        // Record the session that was closed.
        closedSessionId = currentSessionId;
        currentSessionId = null;
    }

    // Update the session ID and its display, but only if the shipwallet container exists.
    function updateSessionId(sessionId) {
        if (!sessionId) return;
        // Only update if the container is present.
        if (!document.getElementById('shipwallet-container')) {
            removeDebugElements();
            return;
        }
        // Do not update if the incoming session id is the same as the one that was closed.
        if (closedSessionId === sessionId) return;
        // Only update if we have a new session id.
        if (currentSessionId === sessionId) return;

        // Since we have a new session, clear the closedSessionId.
        closedSessionId = null;
        currentSessionId = sessionId;
        createOrUpdateSessionIdDisplay(sessionId);
        createOrUpdateDebugButton(sessionId);
    }

    // Create or update the session ID display element.
    function createOrUpdateSessionIdDisplay(sessionId) {
        let sessionIdDisplay = document.getElementById(SESSION_ID_DISPLAY_ID);
        if (!sessionIdDisplay) {
            sessionIdDisplay = document.createElement('div');
            sessionIdDisplay.id = SESSION_ID_DISPLAY_ID;
            sessionIdDisplay.style.position = 'fixed';
            // Increase bottom by 50px if on mad site.
            sessionIdDisplay.style.bottom = isMadSite ? '80px' : '10px';
            sessionIdDisplay.style.right = '10px';
            sessionIdDisplay.style.padding = '5px 10px';
            sessionIdDisplay.style.backgroundColor = '#ffffff';
            sessionIdDisplay.style.color = '#000000';
            sessionIdDisplay.style.border = '1px solid #000000';
            sessionIdDisplay.style.borderRadius = '5px';
            sessionIdDisplay.style.fontFamily = 'Arial, sans-serif';
            sessionIdDisplay.style.fontSize = '12px';
            sessionIdDisplay.style.zIndex = '10000';
            sessionIdDisplay.style.cursor = 'text';
            sessionIdDisplay.style.userSelect = 'text';
            sessionIdDisplay.style.webkitUserSelect = 'text';
            document.body.appendChild(sessionIdDisplay);
        }
        sessionIdDisplay.textContent = sessionId;
    }

    // Create or update the debug button.
    function createOrUpdateDebugButton(sessionId) {
        let debugButton = document.getElementById(DEBUG_BUTTON_ID);
        if (!debugButton) {
            debugButton = document.createElement('button');
            debugButton.id = DEBUG_BUTTON_ID;
            debugButton.textContent = 'Debug';
            debugButton.style.position = 'fixed';
            // Increase bottom by 50px if on mad site.
            debugButton.style.bottom = isMadSite ? '115px' : '45px';
            debugButton.style.right = '10px';
            debugButton.style.padding = '10px 15px';
            // Extra right padding to accommodate the close icon.
            debugButton.style.paddingRight = '25px';
            debugButton.style.backgroundColor = '#001F3F';
            debugButton.style.color = '#ffffff';
            debugButton.style.border = 'none';
            debugButton.style.borderRadius = '5px';
            debugButton.style.cursor = 'pointer';
            debugButton.style.fontFamily = 'Arial, sans-serif';
            debugButton.style.zIndex = '10000';
            // Ensure the button is positioned so its children can be absolutely positioned relative to it.
            debugButton.style.overflow = 'visible';
            document.body.appendChild(debugButton);
        }
        // Remove any old event listeners by cloning the button.
        const newDebugButton = debugButton.cloneNode(true);
        debugButton.parentNode.replaceChild(newDebugButton, debugButton);
        newDebugButton.addEventListener('click', () => {
            window.open(`https://debug.ingrid.com/session-history?id=${sessionId}`, '_blank');
        });
        // Add close icon (small "X") to debug button.
        let closeIcon = newDebugButton.querySelector('.debug-close-icon');
        if (!closeIcon) {
            closeIcon = document.createElement('span');
            closeIcon.className = 'debug-close-icon';
            closeIcon.textContent = '✖';
            closeIcon.style.position = 'absolute';
            closeIcon.style.top = '2px';
            closeIcon.style.right = '2px';
            closeIcon.style.cursor = 'pointer';
            closeIcon.style.fontSize = '10px';
            closeIcon.style.color = '#ffffff';
            closeIcon.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            closeIcon.style.borderRadius = '50%';
            closeIcon.style.padding = '2px';
            closeIcon.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering the debug button's click event.
                removeDebugElements();
            });
            newDebugButton.appendChild(closeIcon);
        }
    }

    // Extract the first Ingrid code and update the session ID.
    function extractFirstIngridCodeAndDisplay(data) {
        let firstCode = null;
        (function search(obj) {
            if (firstCode) return;
            if (obj && typeof obj === 'object') {
                if (Array.isArray(obj.availableDeliveryStrategies)) {
                    for (const strategy of obj.availableDeliveryStrategies) {
                        if (strategy && strategy.code && strategy.code.startsWith("ingrid")) {
                            firstCode = strategy.code;
                            break;
                        }
                    }
                }
                if (!firstCode) {
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            search(obj[key]);
                            if (firstCode) return;
                        }
                    }
                }
            }
        })(data);

        if (firstCode) {
            const match = firstCode.match(/^ingrid\[(.*?)\]/);
            const sessionId = match && match[1] ? match[1] : firstCode;
            updateSessionId(sessionId);
        }
    }

    // Intercept fetch calls for GraphQL Proposal operations.
    const origFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = (typeof input === 'string') ? input : input.url;
        if (url && url.includes("graphql?operationName=Proposal")) {
            return origFetch(input, init).then(resp => {
                const clone = resp.clone();
                clone.json().then(data => {
                    extractFirstIngridCodeAndDisplay(data);
                }).catch(err => {
                    // Ignore JSON parsing errors.
                });
                return resp;
            });
        }
        return origFetch(input, init);
    };

    // Intercept XMLHttpRequest calls.
    const origXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
        this._url = url;
        return origXHROpen.apply(this, arguments);
    };

    const origXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
        if (this._url && this._url.includes("graphql?operationName=Proposal")) {
            this.addEventListener("load", () => {
                try {
                    const responseData = JSON.parse(this.responseText);
                    extractFirstIngridCodeAndDisplay(responseData);
                } catch (e) {
                    // Ignore JSON parsing errors.
                }
            });
        }
        return origXHRSend.apply(this, arguments);
    };

    // Extract session ID from the iframe src URL.
    function extractSessionIdFromIframeSrc(src) {
        const needle = 'sessionId%22%3A%22';
        const index = src.indexOf(needle);
        if (index === -1) return null;
        const start = index + needle.length;
        const lengthUUID = 36;
        return src.substring(start, start + lengthUUID);
    }

    // Handle the widget iframe.
    function handleIframe(iframe) {
        if (!iframe) return;
        const src = iframe.src;
        const sessionId = extractSessionIdFromIframeSrc(src);
        if (sessionId) {
            updateSessionId(sessionId);
        }
        if (iframeObserver) {
            iframeObserver.disconnect();
        }
        iframeObserver = new MutationObserver((mutationList) => {
            mutationList.forEach(m => {
                if (m.type === 'attributes' && m.attributeName === 'src') {
                    const newSrc = iframe.src;
                    const newSessionId = extractSessionIdFromIframeSrc(newSrc);
                    if (newSessionId) {
                        updateSessionId(newSessionId);
                    }
                }
            });
        });
        iframeObserver.observe(iframe, { attributes: true });
    }

    // Handle node additions.
    function handleNodeAddition(node) {
        if (node.id === WIDGET_IFRAME_ID && node.tagName === 'IFRAME') {
            handleIframe(node);
        }
    }

    // Handle node removal. We keep this in case the widget iframe is directly removed.
    function handleNodeRemoval(node) {
        if (node.id === WIDGET_IFRAME_ID && node.tagName === 'IFRAME') {
            if (iframeObserver) {
                iframeObserver.disconnect();
                iframeObserver = null;
            }
        }
    }

    // Handle attribute changes in the DOM.
    function handleAttributeChange(mutation) {
        const iframe = document.getElementById(WIDGET_IFRAME_ID);
        if (iframe) {
            handleIframe(iframe);
        }
    }

    // Callback for the MutationObserver.
    function mutationCallback(mutationsList) {
        mutationsList.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(handleNodeAddition);
                mutation.removedNodes.forEach(handleNodeRemoval);
            }
            if (mutation.type === 'attributes') {
                handleAttributeChange(mutation);
            }
        });
        // Check if the "shipwallet-container" exists. If not, remove debug elements.
        if (!document.getElementById('shipwallet-container')) {
            removeDebugElements();
        }
    }

    // Check if the widget iframe exists on load.
    function initialCheck() {
        const iframe = document.getElementById(WIDGET_IFRAME_ID);
        if (iframe) {
            handleIframe(iframe);
        }
    }

    // Set up the observer on page load.
    window.addEventListener('load', function() {
        if (!observer) {
            observer = new MutationObserver(mutationCallback);
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        }
        initialCheck();
    });

})();
