// ==UserScript==
// @name         Own API Token, Site ID and Private Key Extractor
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Dynamically extracts Bearer token and Site ID from API calls, fetches the private key upon updates, encodes it in Base64, logs them, and stores them in global variables
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Own%20API%20Token%2C%20Site%20ID%20and%20Private%20Key%20Extractor.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Own%20API%20Token%2C%20Site%20ID%20and%20Private%20Key%20Extractor.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    try {
        // Initialize global variables
        window.siteId = null;
        window.authToken = null;
        window.privateKeyBase64 = null; // Initialize the private key variable
        window._fetchingPrivateKey = false; // Flag to prevent concurrent fetches

        // Utility function to encode a string to Base64
        function encodeToBase64(str) {
            try {
                return btoa(str);
            } catch (e) {
                console.error("Failed to encode string to Base64:", e);
                return null;
            }
        }

        // Function to fetch and encode the private key
        async function fetchAndEncodePrivateKey() {
            // Prevent concurrent fetches
            if (window._fetchingPrivateKey) {
                return;
            }

            // Ensure that siteId and authToken are available
            if (!window.siteId || !window.authToken) {
                console.log("Site ID or Auth Token not available. Cannot fetch private key.");
                return;
            }

            window._fetchingPrivateKey = true;

            try {
                // Determine the appropriate API endpoint based on the current URL
                let apiEndpoint;
                const currentUrl = window.location.href;

                if (currentUrl.startsWith("https://mad-stage.ingrid.com/")) {
                    apiEndpoint = "https://api-stage.ingrid.com/v1/config/privatekey.get";
                } else if (currentUrl.startsWith("https://mad.ingrid.com/")) {
                    apiEndpoint = "https://api.ingrid.com/v1/config/privatekey.get";
                } else {
                    console.log("Current URL does not match target domains. Skipping private key fetch.");
                    window._fetchingPrivateKey = false;
                    return;
                }

                // Construct the full API URL with the site_id parameter
                const urlWithParams = `${apiEndpoint}?site_id=${encodeURIComponent(window.siteId)}`;

                // Make the API call to fetch the private key
                const response = await fetch(urlWithParams, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${window.authToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.error(`Failed to fetch private key. Status: ${response.status}`);
                    window.privateKeyBase64 = null;
                    window._fetchingPrivateKey = false;
                    return;
                }

                const data = await response.json();

                // Assuming the private key is in the 'private_key' field
                if (data.private_key) {
                    // Encode the private key in Base64
                    const encodedPrivateKey = encodeToBase64(data.private_key);
                    if (encodedPrivateKey) {
                        console.log("Private Key (Base64):", encodedPrivateKey);
                        window.privateKeyBase64 = encodedPrivateKey; // Store in global variable

                        // Dispatch the 'privateKeyReady' event
                        const event = new CustomEvent('privateKeyReady', { detail: encodedPrivateKey });
                        window.dispatchEvent(event);
                    } else {
                        console.log("Failed to encode Private Key to Base64.");
                        window.privateKeyBase64 = null;
                    }
                } else {
                    console.log("Private Key not found in the response.");
                    window.privateKeyBase64 = null; // Clear if not found
                }
            } catch (error) {
                console.error("Error fetching or encoding the private key:", error);
            } finally {
                window._fetchingPrivateKey = false;
            }
        }

        // Function to handle updates to siteId and authToken
        function handleUpdate() {
            // Fetch the private key whenever siteId or authToken is updated
            fetchAndEncodePrivateKey();
        }

        // Utility function to extract Authorization header from fetch/XHR config
        function extractAuthToken(headers) {
            if (!headers) return null;

            // Headers can be a Headers instance or an object
            if (headers instanceof Headers) {
                return headers.get('Authorization') || headers.get('authorization') || null;
            } else if (typeof headers === 'object') {
                for (let key in headers) {
                    if (headers.hasOwnProperty(key) && key.toLowerCase() === 'authorization') {
                        return headers[key];
                    }
                }
            }

            return null;
        }

        // Function to process fetch/XHR calls for authToken and siteId
        function processApiCall(url, headers) {
            // Extract the Authorization header
            let token = extractAuthToken(headers);

            // Extract the siteId from the URL if present
            let siteId = null;
            try {
                const urlObj = new URL(url, window.location.origin);
                siteId = urlObj.searchParams.get('siteId');
            } catch (e) {
                console.error("Failed to parse URL:", e);
            }

            // Handle authToken
            let tokenChanged = false;
            if (token && token.startsWith("Bearer ")) {
                const bearerToken = token.split(' ')[1];
                if (window.authToken !== bearerToken) {
                    console.log("Bearer Token:", bearerToken);
                    window.authToken = bearerToken; // Update global variable
                    tokenChanged = true;
                }
            }

            // Handle siteId
            let siteIdChanged = false;
            if (siteId) {
                if (window.siteId !== siteId) {
                    console.log("Site ID:", siteId);
                    window.siteId = siteId; // Update global variable
                    siteIdChanged = true;
                }
            }

            // If either authToken or siteId has changed, handle the update
            if (tokenChanged || siteIdChanged) {
                handleUpdate();
            }
        }

        // Intercept fetch calls
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const [resource, config] = args;

                // Normalize the resource to a URL string
                let url = null;
                if (typeof resource === 'string') {
                    url = resource;
                } else if (resource instanceof Request) {
                    url = resource.url;
                }

                // Extract headers from config or Request object
                let headers = null;
                if (config && config.headers) {
                    headers = config.headers;
                } else if (resource instanceof Request) {
                    headers = resource.headers;
                }

                if (url) {
                    processApiCall(url, headers);
                }
            } catch (error) {
                console.error("Error in fetch interceptor:", error);
            }

            // Proceed with the original fetch call
            return originalFetch.apply(this, args);
        };

        // Intercept XMLHttpRequest calls
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            this._url = url;
            return originalXHROpen.apply(this, arguments);
        };

        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            this.addEventListener('readystatechange', function() {
                try {
                    if (this.readyState === 1) { // OPENED state
                        // Attempt to extract Authorization header if possible
                        const headers = this._headers || {};
                        // Note: Browsers do not expose request headers for XHR, so this is limited
                        // If you have control over the headers being set, you could intercept them here
                    }

                    if (this.readyState === 4 && this.status === 200) {
                        if (this._url.includes("/v1/config/site.get")) {
                            // Due to CORS, accessing request headers is restricted
                            console.log("Authorization header in XHR cannot be accessed due to CORS policies.");

                            // Extract the siteId from the URL
                            try {
                                const urlObj = new URL(this._url, window.location.origin);
                                const siteId = urlObj.searchParams.get('siteId');
                                let siteIdChanged = false;

                                if (siteId) {
                                    if (window.siteId !== siteId) {
                                        console.log("Site ID:", siteId);
                                        window.siteId = siteId; // Store in global variable
                                        siteIdChanged = true;
                                    }
                                } else {
                                    console.log("Site ID: Not found in URL");
                                }

                                // Attempt to fetch the private key if authToken is already available
                                if (siteIdChanged && window.authToken) {
                                    handleUpdate();
                                }
                            } catch (e) {
                                console.error("Failed to parse URL:", e);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error in XHR interceptor:", error);
                }
            });
            return originalXHRSend.apply(this, arguments);
        };

        // Override XMLHttpRequest.prototype.setRequestHeader to capture headers
        const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
            if (!this._headers) {
                this._headers = {};
            }
            this._headers[header] = value;
            return originalSetRequestHeader.apply(this, arguments);
        };

        console.log("API Token and Site ID Extractor with Dynamic Private Key Fetcher script loaded.");
    } catch (e) {
        console.error("Error initializing API Token and Site ID Extractor with Dynamic Private Key Fetcher script:", e);
    }
})();
