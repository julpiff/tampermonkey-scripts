// ==UserScript==
// @name         JSON Config Editor
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Enhanced JSON configuration editor
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      api-stage.ingrid.com
// @connect      api.ingrid.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jsonlint/1.6.0/jsonlint.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/javascript/javascript.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/edit/closebrackets.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/comment/comment.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/fold/foldcode.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/fold/foldgutter.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/fold/brace-fold.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/lint/lint.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/lint/json-lint.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/search/searchcursor.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/search/search.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/dialog/dialog.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/search/matchesonscrollbar.min.js
// @resource     CodeMirrorCSS https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css
// @resource     ThemeCSS https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/dracula.min.css
// @resource     LintCSS https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/lint/lint.min.css
// @resource     SearchDialogCSS https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/dialog/dialog.min.css
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/JSON%20Config%20Editor.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/JSON%20Config%20Editor.user.js
// ==/UserScript==

(function() {
    'use strict';
    // Ensure window.jsonlint is defined for CodeMirror's JSON linting
    if (typeof jsonlint !== 'undefined') {
        window.jsonlint = jsonlint;
    }
    // Unique prefix to avoid naming conflicts
    const PREFIX = 'ingrid-json-editor-';

    // Avoid conflicts with existing jQuery versions on the page
    const $ = window.jQuery.noConflict(true);


    /* ------------------- Debounce Mechanism ------------------- */

    // Debounce timer for search
    let searchTimeout;

    /**
     * Debounced version of performSearch to limit search execution frequency.
     */
    function debouncePerformSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch();
        }, 300); // 300ms debounce delay
    }

    /* ------------------- CSS Styles ------------------- */

    GM_addStyle(`
    /* CodeMirror and Theme CSS */
    ${GM_getResourceText("CodeMirrorCSS")}
    ${GM_getResourceText("ThemeCSS")}
    ${GM_getResourceText("LintCSS")}
    ${GM_getResourceText("SearchDialogCSS")}
    /* Additional Linting CSS if needed */

    /* General Overlay Styles */
    .${PREFIX}overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.6) !important;
        display: none !important; /* Initially hidden */
        align-items: center !important;
        justify-content: center !important;
        z-index: 100000 !important; /* Ensure it's on top */
        overflow: hidden !important;
        opacity: 0;
        transition: opacity 0.5s ease;
    }

    /* Show class to display the overlay with animation */
    .${PREFIX}overlay.show {
        display: flex !important;
        animation: ${PREFIX}overlayFadeIn 0.5s forwards;
    }

    /* Hide class to hide the overlay with animation */
    .${PREFIX}overlay.hide {
        animation: ${PREFIX}overlayFadeOut 0.5s forwards;
    }

    /* Modal Container Styles */
    .${PREFIX}modal-container {
        background: #16213e !important; /* Match sidebar background */
        width: 75% !important;
        height: 75%;
        max-width: 100% !important;
        max-height: 100% !important;
        border-radius: 12px !important; /* More rounded corners for modern look */
        display: flex !important;
        flex-direction: row !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        position: relative !important;
        overflow: hidden !important;
        transition: width 0.5s ease, height 0.5s ease, border-radius 0.5s ease !important;
        transform: scale(1) !important;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
    }

    /* Fullscreen Mode */
    .${PREFIX}modal-container.fullscreen {
        width: 100vw !important;
        height: 100vh !important;
        border-radius: 0 !important;
    }

    /* Animation Classes for Modal Container */
    .${PREFIX}modal-container.open {
        animation: ${PREFIX}fadeIn 0.5s forwards;
    }

    .${PREFIX}modal-container.close {
        animation: ${PREFIX}fadeOut 0.5s forwards;
    }

    /* Sidebar Styles */
    .${PREFIX}sidebar {
        min-width: 350px !important;
        flex-shrink: 0 !important;
        background: #16213e !important;
        color: #e0e1dd !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        transition: transform 0.3s ease-in-out !important;
        overflow-y: auto !important;
    }

    /* Sidebar Scrollbar Styling */
    .${PREFIX}sidebar::-webkit-scrollbar {
        width: 12px;
    }
    .${PREFIX}sidebar::-webkit-scrollbar-track {
        background: #16213e;
    }
    .${PREFIX}sidebar::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        border: 3px solid #16213e;
    }
    /* Firefox Scrollbar Styling */
    .${PREFIX}sidebar {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) #16213e;
    }

    /* Sidebar Header */
    .${PREFIX}sidebar-header {
        font-size: 1.4em !important;
        font-weight: bold !important;
        margin-bottom: 20px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
    }

    /* Close Button in Sidebar */
    .${PREFIX}close-sidebar {
        background: transparent !important;
        border: none !important;
        color: #e0e1dd !important;
        font-size: 24px !important;
        cursor: pointer !important;
        transition: color 0.3s !important;
    }
    .${PREFIX}close-sidebar:hover {
        color: #ff6b6b !important;
    }

    /* Fullscreen Toggle Button */
    .${PREFIX}fullscreen-toggle {
        background: transparent !important;
        border: none !important;
        color: #e0e1dd !important;
        font-size: 20px !important;
        cursor: pointer !important;
        transition: color 0.3s !important;
        margin-left: 10px !important;
        padding: 5px; /* Added padding for better click area */
    }
    .${PREFIX}fullscreen-toggle:hover {
        color: #ff6b6b !important;
    }

    /* Fullscreen Toggle Icon */
    .${PREFIX}fullscreen-toggle::before {
        content: '\\26F6'; /* Unicode for maximize icon */
        display: inline-block;
        transition: transform 0.3s ease-in-out;
        font-family: Arial, sans-serif; /* Ensure a standard font */
        font-size: 20px; /* Match the button's font size */
    }
    .${PREFIX}modal-container.fullscreen .${PREFIX}fullscreen-toggle::before {
        content: '\\2715'; /* Unicode for close icon */
        transform: rotate(45deg);
    }

    /* JSON List Styles */
    .${PREFIX}json-list {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
        flex: 1 !important;
    }
    .${PREFIX}json-list li {
        padding: 10px 15px !important;
        background: #16213e !important; /* Match sidebar background */
        margin-bottom: 10px !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: background 0.3s, transform 0.2s !important;
        font-size: 0.98em !important;
    }
    .${PREFIX}json-list li:hover {
        background: #0f4c81 !important;
        transform: translateX(5px) !important;
    }
    .${PREFIX}json-list li.active {
        background: #28a745 !important;
        color: #ffffff !important;
    }

    /* Add JSON File Button */
    .${PREFIX}add-json-button {
        background: #28a745 !important;
        border: none !important;
        color: #ffffff !important;
        padding: 8px 12px !important; /* Reduced padding for smaller size */
        border-radius: 4px !important; /* Less rounded corners */
        cursor: pointer !important;
        font-size: 0.9em !important; /* Smaller font size */
        transition: background 0.3s, transform 0.2s !important;
        margin-top: 10px !important;
        align-self: flex-start !important; /* Align to the start */
    }
    .${PREFIX}add-json-button:hover {
        background: #218838 !important;
        transform: translateY(-2px) !important;
    }

    /* Add JSON Modal Overlay Styles */
    .${PREFIX}add-json-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.6) !important;
        display: none !important; /* Initially hidden */
        align-items: center !important;
        justify-content: center !important;
        z-index: 100010 !important; /* Higher than main modal */
        overflow: hidden !important;
        opacity: 0;
        transition: opacity 0.5s ease;
    }

    /* Show class to display the add JSON overlay with animation */
    .${PREFIX}add-json-overlay.show {
        display: flex !important;
        opacity: 1;
        backdrop-filter: blur(8px); /* Adds a blur effect */
        -webkit-backdrop-filter: blur(8px); /* Ensures compatibility for WebKit browsers */
    }

    /* Hide class to hide the add JSON overlay with animation */
    .${PREFIX}add-json-overlay.hide {
        opacity: 0;
        display: none;
    }

    /* Add JSON Modal Container Styles */
    .${PREFIX}add-json-modal-container {
        background: #16213e !important; /* Match sidebar background */
        width: 50% !important;
        height: 60% !important;
        max-width: 600px !important;
        max-height: 500px !important;
        border-radius: 12px !important;
        display: flex !important;
        flex-direction: column !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        position: relative !important;
        overflow: hidden !important;
        transition: width 0.5s ease, height 0.5s ease, border-radius 0.5s ease !important;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
        overflow-x: hidden !important; /* Prevent horizontal scrollbar */
        font-size: 1em; /* Adjust to match the main modal's font size */
        font-weight: 400; /* Use the same font-weight as the main modal */
        color: #e0e1dd; /* Use the same text color as the main modal */
    }

    /* Animation Classes for Add JSON Modal */
    .${PREFIX}add-json-modal-container.open {
        animation: ${PREFIX}fadeIn 0.5s forwards;
    }

    .${PREFIX}add-json-modal-container.close {
        animation: ${PREFIX}fadeOut 0.5s forwards;
    }

    /* Add JSON Modal Header */
    .${PREFIX}add-json-modal-header {
        font-size: 1.4em !important;
        font-weight: bold !important;
        margin-bottom: 20px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 0 20px !important;
        background: #16213e !important; /* Match sidebar background */
    }

    /* Close Button in Add JSON Modal */
    .${PREFIX}close-add-json-modal {
        background: transparent !important;
        border: none !important;
        color: #e0e1dd !important;
        font-size: 24px !important;
        cursor: pointer !important;
        transition: color 0.3s !important;
    }
    .${PREFIX}close-add-json-modal:hover {
        color: #ff6b6b !important;
    }

    /* Add JSON List Styles */
    .${PREFIX}add-json-list {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
        flex: 1 !important;
        overflow-y: auto !important;
        background: #16213e !important; /* Match sidebar background */
        border-top: 1px solid #444 !important; /* Separator */
    }

    .${PREFIX}add-json-list li {
        padding: 12px 18px !important;
        background: #16213e !important; /* Match sidebar background */
        margin-bottom: 10px !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: background 0.3s, transform 0.2s !important;
        font-size: 1em !important;
        border: 1px solid transparent !important; /* For active state */
    }
    .${PREFIX}add-json-list li:hover {
        background: #0f4c81 !important;
        transform: translateX(5px) !important;
    }
    .${PREFIX}add-json-list li.active {
        background: #28a745 !important;
        color: #ffffff !important;
        border-color: #1e7e34 !important; /* Border to indicate active */
    }

    /* Add JSON Modal Buttons */
    .${PREFIX}add-json-modal-container button {
        padding: 10px 20px !important;
        background: #0f4c81 !important; /* Consistent button color */
        color: #e0e1dd !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-size: 1em !important;
        transition: background 0.3s, transform 0.2s !important;
        margin: 10px 20px !important;
    }
    .${PREFIX}add-json-modal-container button:hover {
        background: #0a3d62 !important;
        transform: translateY(-2px) !important;
    }

    /* Editor Pane Styles */
    .${PREFIX}editor-pane {
        flex: 1 !important;
        background: #1e1e2f !important;
        color: #e0e1dd !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        position: relative !important;
        overflow: hidden !important;
    }

    /* Editor Scrollbar Styling */
    .${PREFIX}editor-pane::-webkit-scrollbar {
        width: 12px;
    }
    .${PREFIX}editor-pane::-webkit-scrollbar-track {
        background: #1e1e2f;
    }
    .${PREFIX}editor-pane::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        border: 3px solid #1e1e2f;
    }
    /* Firefox Scrollbar Styling */
    .${PREFIX}editor-pane {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) #1e1e2f;
    }

    /* Editor Header */
    .${PREFIX}editor-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 10px !important;
    }

    /* Editor Title */
    .${PREFIX}editor-title {
        font-size: 1.4em !important;
        font-weight: bold !important;
        display: flex !important;
        align-items: center !important;
    }

    /* Close Modal Button */
    .${PREFIX}close-modal {
        background: transparent !important;
        border: none !important;
        color: #e0e1dd !important;
        font-size: 28px !important;
        cursor: pointer !important;
        transition: color 0.3s !important;
    }
    .${PREFIX}close-modal:hover {
        color: #ff6b6b !important;
    }

    /* Editor Footer Styles */
    .${PREFIX}editor-footer {
        padding: 15px 0 !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 10px !important;
    }

    /* Footer Buttons Styles */
    .${PREFIX}editor-footer button {
        padding: 10px 20px !important;
        background: #0f4c81 !important; /* Updated button color */
        color: #e0e1dd !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-size: 1em !important;
        transition: background 0.3s, transform 0.2s !important;
    }
    .${PREFIX}editor-footer button:hover {
        background: #0a3d62 !important;
        transform: translateY(-2px) !important;
    }

    /* Save Button Specific Styles */
    #${PREFIX}save-json {
        background: #28a745 !important;
    }
    #${PREFIX}save-json:hover {
        background: #218838 !important;
    }

    /* Spinner Overlay Styles */
    .${PREFIX}spinner-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.4) !important;
        display: none !important; /* Initially hidden */
        align-items: center !important;
        justify-content: center !important;
        z-index: 100011 !important; /* Highest z-index */
    }
    .${PREFIX}spinner {
        border: 8px solid #f3f3f3 !important;
        border-top: 8px solid #0f4c81 !important;
        border-radius: 50% !important;
        width: 60px !important;
        height: 60px !important;
        animation: ${PREFIX}spin 1s linear infinite !important;
    }
    @keyframes ${PREFIX}spin {
        0% { transform: rotate(0deg) !important; }
        100% { transform: rotate(360deg) !important; }
    }

    /* Toast Notification Styles */
    #${PREFIX}toast-container {
        position: fixed !important;
        top: 25px !important;
        right: 25px !important;
        z-index: 100012 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
    }
    .${PREFIX}toast {
        min-width: 260px !important;
        max-width: 360px !important;
        padding: 14px 22px !important;
        border-radius: 8px !important;
        color: #ffffff !important;
        font-size: 1em !important;
        box-shadow: 0 6px 18px rgba(0,0,0,0.4) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        animation: ${PREFIX}slideIn 0.5s ease-out !important;
    }
    @keyframes ${PREFIX}slideIn {
        from { opacity: 0; transform: translateX(100%) !important; }
        to { opacity: 1; transform: translateX(0) !important; }
    }
    .${PREFIX}toast.success {
        background-color: #28a745 !important;
    }
    .${PREFIX}toast.error {
        background-color: #dc3545 !important;
    }
    .${PREFIX}toast.info {
        background-color: #17a2b8 !important;
    }
    .${PREFIX}toast .close-toast {
        margin-left: 18px !important;
        cursor: pointer !important;
        font-weight: bold !important;
        font-size: 1.3em !important;
        transition: color 0.3s !important;
    }
    .${PREFIX}toast .close-toast:hover {
        color: #cccccc !important;
    }

    /* CodeMirror Editor Styles */
    .CodeMirror {
        flex: 1 !important;
        height: auto !important;
        background: #1e1e2f !important;
        color: #e0e1dd !important;
        white-space: pre !important;
        border: 1px solid #444 !important;
    }
    .CodeMirror-gutters {
        background: #16213e !important;
        border-right: 1px solid #444 !important;
    }

    /* Error Highlight Styles */
    .CodeMirror-lint-marker-error {
        color: #ff6b6b !important;
    }

    /* Match Highlight Styles */
    .cm-search-highlight {
        background-color: rgba(255, 255, 0, 0.25) !important; /* Lighter yellow highlight for matches */
        border-radius: 3px !important;
        z-index: 1; /* Ensure it appears above active line highlight */
    }

    /* Active Match Highlight */
    .cm-active-match-highlight {
        background-color: rgba(255, 255, 0, 0.5) !important; /* Prominent yellow highlight for active match */
        border-radius: 3px !important;
        z-index: 2; /* Ensure it appears above other highlights */
    }

    /* Integrated Search Box Styles */
    .${PREFIX}search-container {
        position: absolute !important;
        top: 15px !important;
        right: 100px !important; /* Adjusted to move more to the left */
        background: rgba(42, 42, 64, 0.9) !important;
        padding: 8px !important;
        border-radius: 4px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        z-index: 100200 !important; /* Ensure it's above other elements */
    }
    .${PREFIX}search-container input {
        padding: 5px 8px !important;
        border: 1px solid #444 !important;
        border-radius: 4px !important;
        background: #1e1e2f !important;
        color: #e0e1dd !important;
        font-size: 0.9em !important;
    }
    .${PREFIX}search-container button {
        background: #0f4c81 !important;
        color: #e0e1dd !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 5px 10px !important;
        cursor: pointer !important;
        transition: background 0.3s !important;
        font-size: 0.9em !important;
    }
    .${PREFIX}search-container button:hover {
        background: #0a3d62 !important;
    }
    .${PREFIX}search-container .match-count {
        color: #e0e1dd !important;
        font-size: 0.9em !important;
    }

    /* No Matches Message Styles */
    .${PREFIX}no-matches-message {
        color: red !important;
        font-size: 0.85em !important;
        margin-top: 4px !important;
        display: none; /* Initially hidden */
    }

    /* Responsive Adjustments */
    @media (max-width: 800px) {
        .${PREFIX}modal-container {
            flex-direction: column !important;
            width: 95% !important;
            height: 95% !important;
        }
        .${PREFIX}sidebar {
            width: 100% !important;
            height: 200px !important;
            overflow-x: auto !important;
            flex-direction: row !important;
        }
        .${PREFIX}json-list {
            display: flex !important;
            flex-direction: row !important;
        }
        .${PREFIX}json-list li {
            margin-right: 10px !important;
            margin-bottom: 0 !important;
        }
        .${PREFIX}editor-pane {
            flex: none !important;
            height: calc(100% - 200px) !important;
        }
    .${PREFIX}search-container {
        top: 5px !important;
        right: 55px !important; /* Further adjusted for smaller screens */
        flex-direction: column !important;
        gap: 4px !important;
    }
    .${PREFIX}search-container button {
        padding: 5px 8px !important;
    }
    .${PREFIX}no-matches-message {
        font-size: 0.8em !important;
    }
    }

    /* Add Keyframe Animations */
    @keyframes ${PREFIX}fadeIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes ${PREFIX}fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }

    @keyframes ${PREFIX}overlayFadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes ${PREFIX}overlayFadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }

    /* Animation Classes */
    .${PREFIX}modal-container.open {
        animation: ${PREFIX}fadeIn 0.5s forwards;
    }

    .${PREFIX}modal-container.close {
        animation: ${PREFIX}fadeOut 0.5s forwards;
    }

    .${PREFIX}overlay.show {
        display: flex !important;
        animation: ${PREFIX}overlayFadeIn 0.5s forwards;
        backdrop-filter: blur(8px); /* Adds a blur effect */
        -webkit-backdrop-filter: blur(8px); /* Ensures compatibility for WebKit browsers */
    }

    .${PREFIX}overlay.hide {
        animation: ${PREFIX}overlayFadeOut 0.5s forwards;
    }

    /* Animation Classes for Add JSON Modal */
    .${PREFIX}add-json-modal-container.open {
        animation: ${PREFIX}fadeIn 0.5s forwards;
    }

    .${PREFIX}add-json-modal-container.close {
        animation: ${PREFIX}fadeOut 0.5s forwards;
    }

    /* Disable animations for users who prefer reduced motion */
    @media (prefers-reduced-motion: reduce) {
        .${PREFIX}modal-container.open,
        .${PREFIX}modal-container.close,
        .${PREFIX}overlay.show,
        .${PREFIX}overlay.hide,
        .${PREFIX}add-json-modal-container.open,
        .${PREFIX}add-json-modal-container.close,
        .${PREFIX}add-json-overlay.show,
        .${PREFIX}add-json-overlay.hide {
            animation: none !important;
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    }

    /* CodeMirror Dialog Override for Dark Theme */
    .CodeMirror-dialog {
        background: #1e1e2f !important;
        color: #e0e1dd !important;
        border: 1px solid #444 !important;
        border-radius: 6px !important;
    }
    .CodeMirror-dialog input {
        background: #2a2a40 !important;
        color: #e0e1dd !important;
        border: 1px solid #444 !important;
        border-radius: 4px !important;
    }
    .CodeMirror-dialog label {
        color: #e0e1dd !important;
    }
    .CodeMirror-dialog .CodeMirror-dialog-button {
        background: #0f4c81 !important;
        color: #e0e1dd !important;
        border: none !important;
        border-radius: 4px !important;
        padding: 5px 10px !important;
        cursor: pointer !important;
    }
    .CodeMirror-dialog .CodeMirror-dialog-button:hover {
        background: #0a3d62 !important;
    }

    /* No Matches Message Styles */
    .${PREFIX}no-matches-message {
        color: red !important;
        font-size: 0.85em !important;
        margin-top: 4px !important;
        display: none; /* Initially hidden */
    }
    `);
    /* ------------------- Modal Structures ------------------- */

    // Create Spinner Overlay
    const spinnerOverlay = $(`
        <div class="${PREFIX}overlay" id="${PREFIX}spinner-overlay">
            <div class="${PREFIX}spinner"></div>
        </div>
    `);
    $('body').append(spinnerOverlay);

    // Create Toast Container
    const toastContainer = $(`
        <div id="${PREFIX}toast-container"></div>
    `);
    $('body').append(toastContainer);

    // Create Main Editor Modal Overlay and Container
    const modalOverlay = $(`
        <div class="${PREFIX}overlay" id="${PREFIX}modal-overlay">
            <div class="${PREFIX}modal-container">
                <!-- Sidebar for JSON Selection -->
                <div class="${PREFIX}sidebar">
                    <div class="${PREFIX}sidebar-header">
                        <span>JSON Files</span>
                        <div>
                            <button class="${PREFIX}close-sidebar">&times;</button>
                        </div>
                    </div>
                    <ul class="${PREFIX}json-list" id="${PREFIX}json-list">
                        <!-- Dynamically populated -->
                    </ul>
                    <!-- Add JSON File Button -->
                    <button class="${PREFIX}add-json-button">Add JSON File</button>
                </div>
                <!-- Editor Pane -->
                <div class="${PREFIX}editor-pane">
                    <div class="${PREFIX}editor-header">
                        <span class="${PREFIX}editor-title" id="${PREFIX}editor-title">Editor</span>
                        <div style="display: flex; align-items: center;">
                            <button class="${PREFIX}fullscreen-toggle" title="Toggle Fullscreen"></button>
                            <button class="${PREFIX}close-modal">&times;</button>
                        </div>
                    </div>
                    <!-- Integrated Search Box -->
                    <div class="${PREFIX}search-container" id="${PREFIX}search-container">
                        <input
                            type="text"
                            id="${PREFIX}search-input"
                            placeholder="Search..."
                            autocomplete="off"
                            spellcheck="false"
                            autocorrect="off"
                            autocapitalize="off"
                        >
                        <button id="${PREFIX}search-prev">Prev</button>
                        <button id="${PREFIX}search-next">Next</button>
                        <span class="match-count" id="${PREFIX}match-count">0/0</span>
                        <!-- No Matches Message -->
                        <div class="${PREFIX}no-matches-message" id="${PREFIX}no-matches-message">No matches found.</div>
                    </div>
                    <textarea id="${PREFIX}json-editor-textarea"></textarea>
                    <div class="${PREFIX}editor-footer">
                        <button id="${PREFIX}save-json">Save</button>
                        <button id="${PREFIX}close-editor">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `);
    $('body').append(modalOverlay);

    // Create Add JSON File Modal Overlay and Container
    const addJsonModalOverlay = $(`
        <div class="${PREFIX}add-json-overlay" id="${PREFIX}add-json-overlay">
            <div class="${PREFIX}add-json-modal-container">
                <div class="${PREFIX}add-json-modal-header">
                    <span>Select a JSON File to Add</span>
                    <button class="${PREFIX}close-add-json-modal">&times;</button>
                </div>
                <ul class="${PREFIX}add-json-list" id="${PREFIX}add-json-list">
                    <!-- Dynamically populated -->
                </ul>
            </div>
        </div>
    `);
    $('body').append(addJsonModalOverlay);

    /* ------------------- CodeMirror Initialization ------------------- */

    let editor = null;

    function initializeCodeMirror() {
        const textarea = document.getElementById(`${PREFIX}json-editor-textarea`);
        editor = CodeMirror.fromTextArea(textarea, {
            mode: { name: "javascript", json: true },
            theme: "dracula",
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
            lint: {
                // Use the built-in JSON linter
                getAnnotations: CodeMirror.lint.jsonLint,
                async: false
            },
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "Ctrl-S": function(instance) {
                    saveJSON();
                },
                "Cmd-S": function(instance) { // For Mac users
                    saveJSON();
                },
                "Ctrl-F": function(cm) {
                    openCustomSearch();
                },
                "Cmd-F": function(cm) {
                    openCustomSearch();
                },
                // Prevent default search dialog
                "F3": function(cm) {
                    findNext();
                },
                "Shift-F3": function(cm) {
                    findPrev();
                }
            }
        });


        // Adjust CodeMirror size when the modal is resized
        $(window).on('resize', function() {
            if (editor) {
                editor.setSize('100%', '100%');
            }
        });

// Consolidated change handler with debounced search
editor.on('change', function() {
    editor.refresh();

    if (selectedObjectPath) {
        const currentValue = editor.getValue();
        modifiedConfigs[selectedObjectPath] = currentValue;
    }
});

        /* ------------------- Prevent Default Browser Search ------------------- */

        // Removed the conflicting keydown event listener
        // Rely solely on CodeMirror's extraKeys for handling Cmd+F and Ctrl+F
    }

    /* ------------------- Utility Functions ------------------- */

    let isUpdating = false; // Flag to prevent multiple concurrent updates
    const modifiedConfigs = {}; // Tracks modified JSON files

    function showSpinner() {
        $(`#${PREFIX}spinner-overlay`).fadeIn(200);
    }

    function hideSpinner() {
        $(`#${PREFIX}spinner-overlay`).fadeOut(200);
    }

    function showModal() {
        const $modalOverlay = $(`#${PREFIX}modal-overlay`);
        const $modalContainer = $modalOverlay.find(`.${PREFIX}modal-container`);

        // Remove any existing animation classes
        $modalOverlay.removeClass('hide').addClass('show');
        $modalContainer.removeClass('close').addClass('open');

        $('body').css('overflow', 'hidden'); // Prevent background scrolling

        // Refresh CodeMirror to ensure it renders correctly
        setTimeout(() => {
            if (editor) editor.refresh();
        }, 500); // Match animation duration
    }

function hideModal() {
    const $modalOverlay = $(`#${PREFIX}modal-overlay`);
    const $modalContainer = $modalOverlay.find(`.${PREFIX}modal-container`);

    // Kick off closing animations for the modal container
    $modalContainer.removeClass('open').addClass('close');
    $modalOverlay.removeClass('show').addClass('hide');

    // Fade out the merchant banner concurrently
    $('#merchant-name-banner').fadeOut(500, function() {
        $(this).remove();
    });

    // Ensure the overlay starts at full opacity
    $modalOverlay.css("opacity", "1");

    // Animate the overlay's opacity to fade it out over 500ms
    $modalOverlay.animate({ opacity: 0 }, 500, function() {
        // Once faded out, do the proper cleanup
        $modalOverlay.removeClass('hide').removeClass('show');
        $modalOverlay.css({ opacity: "1" }).show(); // Reset for future use

        $('body').css('overflow', 'auto');

        // Clear editor content
        if (editor) {
            editor.setValue('');
        }
        $(`.${PREFIX}json-list li`).removeClass('active');
        $(`#${PREFIX}editor-title`).text('Editor');

        if ($(`.${PREFIX}modal-container`).hasClass('fullscreen')) {
            toggleFullscreen(false);
        }
        Object.keys(modifiedConfigs).forEach(key => delete modifiedConfigs[key]);
        clearSearch();
        closeCustomSearch();
    });
}

    /**
     * Displays a toast notification.
     * @param {string} message - The message to display.
     * @param {string} type - The type of toast ('success', 'error', or 'info').
     * @param {string|null} traceId - The trace ID for debugging (optional).
     */
    function showToast(message, type = 'success', traceId = null) {
        const toastId = `${PREFIX}toast-${Date.now()}`;
        let toastContent = escapeHtml(message);

        if (type === 'error' && traceId) {
            // Append the Debug button with the trace ID
            const debugButton = `<br><br><button style="background-color: #ff4c4c; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: background-color 0.3s ease, transform 0.2s ease;"
                                 onmouseover="this.style.backgroundColor='#ff2c2c'; this.style.transform='scale(1.05)';"
                                 onmouseout="this.style.backgroundColor='#ff4c4c'; this.style.transform='scale(1)';"
                                 onclick="window.open('https://debug.ingrid.com/view-payloads?trace_id=${encodeURIComponent(traceId)}', '_blank')">Debug</button>`;
            toastContent += debugButton;
        }

        const toast = $(`
            <div class="${PREFIX}toast ${type}" id="${toastId}">
                <span>${toastContent}</span>
                <span class="close-toast">&times;</span>
            </div>
        `);
        toastContainer.append(toast);

        // Auto-remove toast after 5 seconds for success and info, keep for error
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                $(`#${toastId}`).fadeOut(400, function() {
                    $(this).remove();
                });
            }, 5000);
        }

        // Event Listener to close toast manually
        toast.find('.close-toast').on('click', function() {
            $(`#${toastId}`).fadeOut(400, function() {
                $(this).remove();
            });
        });
    }

    function escapeHtml(text) {
        return text
            ? text
                .toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
            : '';
    }

    /* ------------------- API Interaction Functions ------------------- */

    function getApiEndpoint(baseUrl) {
        const currentUrl = window.location.href;
        let endpoint = '';

        if (currentUrl.startsWith('https://mad-stage.ingrid.com/')) {
            endpoint = baseUrl;
        } else if (currentUrl.startsWith('https://mad.ingrid.com/')) {
            endpoint = baseUrl.replace('-stage', '');
        } else {
            throw new Error('Unsupported URL.');
        }

        return endpoint;
    }

// Function to display the merchant name in a fixed banner
function displayMerchantName(name) {
    // Determine environment based on current URL
    const currentUrl = window.location.href;
    const isStage = currentUrl.indexOf('mad-stage.ingrid.com') !== -1;
    const envLabel = isStage ? " (STAGE)" : " (PROD)";
    const bgColor = isStage ? "#91c9c0" : "#16213e";
    const textColor = isStage ? "#1e1e2f" : "#e0e1dd"; // Only on stage, text is #1e1e2f

    let $banner = $('#merchant-name-banner');
    if ($banner.length === 0) {
        $banner = $('<div id="merchant-name-banner"></div>');
        $('body').append($banner);
        $banner.css({
            position: 'fixed',
            height: '50px',
            top: '0',
            left: '0',
            width: '100%',
            background: bgColor,
            color: textColor,
            padding: '10px 20px',
            'font-size': '1.5em',
            'font-weight': 'bold',
            'z-index': 1000000,
            'text-align': 'center'
        });
    } else {
        // Update the background and text color in case the environment has changed
        $banner.css({
            background: bgColor,
            color: textColor
        });
    }
    $banner.text("Merchant: " + name + envLabel);
}

function fetchSiteConfig(callback) {
    const siteId = unsafeWindow.siteId;
    const authToken = unsafeWindow.authToken;

    if (!siteId || !authToken) {
        callback('Missing siteId or authToken.', null, null);
        return;
    }

    const endpoint = getApiEndpoint(`https://api-stage.ingrid.com/v1/config/site.get?site_id=${siteId}`);

    GM_xmlhttpRequest({
        method: "GET",
        url: endpoint,
        headers: {
            "Authorization": `Bearer ${authToken}`,
            "Content-Type": "application/json"
        },
        onload: function(response) {
            if (response.status === 200) {
                try {
                    const data = JSON.parse(response.responseText);

                    if (data && data.site && data.site.name) {
                        displayMerchantName(data.site.name);
                        // Adjust the modal overlay so it doesn't get shoved behind the banner
                        const modalOverlay = document.getElementById('ingrid-json-editor-modal-overlay');
                        if (modalOverlay) {
                            // Using setProperty to force the style with !important
                            modalOverlay.style.setProperty('top', '50px', 'important');
                            modalOverlay.style.setProperty('height', 'calc(100vh - 50px)', 'important');
                        }
                    }

                    callback(null, data, null);
                } catch (e) {
                    callback('Invalid JSON response from site config.', null, null);
                }
            } else {
                let errorMessage = `Failed to fetch site config: ${response.status}`;
                let traceId = null;
                try {
                    const errorData = JSON.parse(response.responseText);
                    if (errorData.trace_id) {
                        traceId = errorData.trace_id;
                        errorMessage += `\nTrace ID: ${traceId}`;
                    }
                    if (errorData.message) {
                        errorMessage += `\nMessage: ${errorData.message}`;
                    }
                } catch (e) {
                    errorMessage += `\nResponse: ${response.responseText}`;
                }
                callback(errorMessage, null, traceId);
            }
        },
        onerror: function() {
            callback('Network error while fetching site config.', null, null);
        }
    });
}


    function updateSiteConfig(updatedConfig, callback) {
        const authToken = unsafeWindow.authToken;

        if (!authToken) {
            callback('Missing authToken.', null, null);
            return;
        }

        const endpoint = getApiEndpoint(`https://api-stage.ingrid.com/v1/config/site.update`);

        GM_xmlhttpRequest({
            method: "POST",
            url: endpoint,
            headers: {
                "Authorization": `Bearer ${authToken}`,
                "Content-Type": "application/json"
            },
            data: JSON.stringify(updatedConfig), // Ensure the entire JSON is sent
            onload: function(response) {
                if (response.status === 200 || response.status === 201) {
                    try {
                        const responseData = JSON.parse(response.responseText);
                        callback(null, responseData, null);
                    } catch (e) {
                        callback('Invalid JSON response from site config update.', null, null);
                    }
                } else {
                    let errorMessage = `Failed to update site config: ${response.status}`;
                    let traceId = null;
                    try {
                        const errorData = JSON.parse(response.responseText);
                        if (errorData.trace_id) {
                            traceId = errorData.trace_id;
                            errorMessage += `\nTrace ID: ${traceId}`;
                        }
                        if (errorData.message) {
                            errorMessage += `\nMessage: ${errorData.message}`;
                        }
                    } catch (e) {
                        errorMessage += `\nResponse: ${response.responseText}`;
                    }
                    callback(errorMessage, null, traceId);
                }
            },
            onerror: function() {
                callback('Network error while updating site config.', null, null);
            }
        });
    }

    /* ------------------- JSON Editor Functions ------------------- */

    // Predefined list for creating new nested objects (excluding 'private_keys')
    const predefinedObjects = [
        'address_form_configuration',
        'custom_booking_methods',
        'custom_shipping_methods',
        'data_retention_configuration',
        'default_receiver_contact',
        'default_sender_contact',
        'delivery_upsell_widget_config',
        'delivery_upsell_widget_configuration',
        'faq_widget_configuration',
        'geo_areas',
        'label_configuration',
        'merchant_id',
        'metadata',
        'ombud_shipping_methods',
        'preselected_choice_rules',
        'product_page_widget_configuration',
        'receipt_widget_configuration',
        'regions',
        'service_configurations',
        'session_post_processing',
        'shipping_categories',
        'sorting_rules',
        'tracking',
        'warehouses',
        'widget_configuration'
    ];

    // List of fields that contain stringified JSON data
    const stringifiedJsonFields = ['configuration_data'];

    let currentConfig = null;
    let selectedObjectPath = null; // Path to the selected object
    let searchMatches = [];
    let currentMatchIndex = -1;
    let activeLineMarker = null; // Marker for active match line
    let activeMatchMarker = null; // Marker for active match word

    /**
     * Escapes special characters in a string for use in a regular expression.
     * @param {string} string - The string to escape.
     * @returns {string} - The escaped string.
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Recursively traverses an object and parses specified string fields as JSON.
     * @param {Object|Array} obj - The object or array to traverse.
     * @param {Array<string>} fields - The list of field names to parse.
     */
    function parseStringifiedFields(obj, fields) {
        if (Array.isArray(obj)) {
            obj.forEach(item => parseStringifiedFields(item, fields));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (fields.includes(key) && typeof obj[key] === 'string') {
                    try {
                        obj[key] = JSON.parse(obj[key]);
                    } catch (e) {
                        showToast(`Failed to parse "${key}" as JSON. Please check the format.`, 'error');
                    }
                } else if (typeof obj[key] === 'object') {
                    parseStringifiedFields(obj[key], fields);
                }
            }
        }
    }

    /**
     * Recursively traverses an object and serializes specified fields as JSON strings.
     * @param {Object|Array} obj - The object or array to traverse.
     * @param {Array<string>} fields - The list of field names to serialize.
     */
    function serializeStringifiedFields(obj, fields) {
        if (Array.isArray(obj)) {
            obj.forEach(item => serializeStringifiedFields(item, fields));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (fields.includes(key) && (typeof obj[key] === 'object' || Array.isArray(obj[key]))) {
                    try {
                        obj[key] = JSON.stringify(obj[key], null, 4);
                    } catch (e) {
                        showToast(`Failed to serialize field "${key}" as JSON.`, 'error');
                    }
                } else if (typeof obj[key] === 'object') {
                    serializeStringifiedFields(obj[key], fields);
                }
            }
        }
    }

    function loadJSONIntoEditor() {
        showSpinner();
        fetchSiteConfig(function(siteErr, siteConfig, siteTraceId) {
            if (siteErr) {
                hideSpinner();
                showToast(siteErr.split('\n')[0], 'error', siteTraceId);
                return;
            }

            currentConfig = siteConfig;
            hideSpinner();
            populateJSONList();
            showModal();

            // Automatically select the first JSON file ("site.json")
            setTimeout(() => {
                const firstItem = $(`.${PREFIX}json-list li`).first();
                if (firstItem.length) {
                    firstItem.trigger('click');
                }
            }, 500); // Increased timeout to match modal animation duration
        });
    }

    function loadSelectedObjectIntoEditor(objectPath, displayName) {
        selectedObjectPath = objectPath;
        let objectToEdit;

        if (objectPath === 'site') {
            // Extract only primitive fields from 'site.json'
            objectToEdit = {};
            for (const key in currentConfig.site) {
                if (typeof currentConfig.site[key] !== 'object' || currentConfig.site[key] === null) {
                    objectToEdit[key] = currentConfig.site[key];
                } else if (stringifiedJsonFields.includes(key)) {
                    // Handle stringified JSON fields
                    try {
                        objectToEdit[key] = JSON.parse(currentConfig.site[key]);
                    } catch (e) {
                        showToast(`Failed to parse "${key}" as JSON. Please check the format.`, 'error');
                    }
                }
            }
        } else {
            objectToEdit = currentConfig.site[objectPath];
            if (objectToEdit === undefined) {
                // Initialize as empty object if not existing
                currentConfig.site[objectPath] = {};
                objectToEdit = {};
            }
        }

        // Parse stringified fields globally
        parseStringifiedFields(objectToEdit, stringifiedJsonFields);

        // Convert objectToEdit to pretty JSON
        const prettyJSON = JSON.stringify(objectToEdit, null, 4);
        editor.setValue(prettyJSON);
        // Update active selection
        $(`.${PREFIX}json-list li`).removeClass('active');
        $(`.${PREFIX}json-list li[data-path="${objectPath}"]`).addClass('active');
        // Update editor title
        $(`#${PREFIX}editor-title`).text(`${displayName}`);

        // Reset search state
        clearSearch();
        closeCustomSearch();
    }

    function saveJSON() {
        if (isUpdating) {
            showToast('An update is already in progress. Please wait until it completes.', 'error');
            return;
        }

        if (Object.keys(modifiedConfigs).length === 0) {
            showToast('No changes to save.', 'info');
            return;
        }

        showSpinner();
        isUpdating = true;
        toggleSaveButtonState(true); // Disable save button

        // Iterate through all modified JSON files
        const updatePromises = Object.keys(modifiedConfigs).map(path => {
            return new Promise((resolve, reject) => {
                let parsedJSON;
                try {
                    parsedJSON = JSON.parse(modifiedConfigs[path]);
                } catch (e) {
                    showToast(`Invalid JSON in ${getDisplayName(path)}: ${e.message}`, 'error');
                    reject(`Invalid JSON in ${path}: ${e.message}`);
                    return;
                }

                // Update the currentConfig with the parsed JSON
                if (path === 'site') {
                    currentConfig.site = { ...currentConfig.site, ...parsedJSON };
                } else {
                    currentConfig.site[path] = parsedJSON;
                }

                resolve();
            });
        });

        // After all modifications are merged, serialize and send the update
        Promise.all(updatePromises)
            .then(() => {
                // Serialize stringified fields
                serializeStringifiedFields(currentConfig.site, stringifiedJsonFields);

                // Send the entire currentConfig via updateSiteConfig
                updateSiteConfig(currentConfig, function(updateErr, updatedData, updateTraceId) {
                    hideSpinner();
                    isUpdating = false;
                    toggleSaveButtonState(false); // Re-enable save button

                    if (updateErr) {
                        const errorMessage = updateErr.split('\n')[0];
                        const traceIdMatch = updateErr.match(/Trace ID: (\S+)/);
                        const traceId = traceIdMatch ? traceIdMatch[1] : null;
                        showToast(errorMessage, 'error', traceId);
                    } else {
                        showToast('All configurations updated successfully.', 'success');
                        // Refresh currentConfig with updated data
                        currentConfig = updatedData;
                        // Reload the currently selected JSON to reflect any changes from the server
                        loadSelectedObjectIntoEditor(selectedObjectPath, getDisplayName(selectedObjectPath));
                        // Clear modifiedConfigs after successful update
                        Object.keys(modifiedConfigs).forEach(key => delete modifiedConfigs[key]);
                    }
                });
            })
            .catch(error => {
                hideSpinner();
                isUpdating = false;
                toggleSaveButtonState(false); // Re-enable save button
                // Errors have already been shown via toasts
            });
    }

    /* ------------------- Helper Functions ------------------- */

    // Get display name for JSON files
    function getDisplayName(path) {
        return path === 'site' ? 'site.json' : `${path}.json`;
    }

    /**
     * Toggles the state of the Save button.
     * @param {boolean} disable - Whether to disable or enable the Save button.
     */
    function toggleSaveButtonState(disable) {
        const $saveButton = $(`#${PREFIX}save-json`);
        if (disable) {
            $saveButton.prop('disabled', true).css('opacity', '0.6').css('cursor', 'not-allowed');
        } else {
            $saveButton.prop('disabled', false).css('opacity', '1').css('cursor', 'pointer');
        }
    }

    /* ------------------- Selection Modal Functions ------------------- */

    function populateJSONList() {
        const jsonList = $(`#${PREFIX}json-list`);
        jsonList.empty();

        // Extract top-level objects and "site.json"
        const site = currentConfig.site || {};
        const existingObjects = [];

        // Extract top-level objects and arrays, excluding 'private_keys'
        for (const key in site) {
            if (typeof site[key] === 'object' && site[key] !== null && key !== 'private_keys') {
                existingObjects.push(`${key}.json`);
            }
        }

        // Add 'site.json' representing primitive fields at the top
        existingObjects.unshift('site.json');

        // Populate the list with "site.json" first
        existingObjects.forEach(objName => {
            const displayName = getDisplayName(objName.replace('.json', ''));
            const path = objName === 'site.json' ? 'site' : objName.replace('.json', '');
            const listItem = $(`
                <li data-path="${path}">${escapeHtml(displayName)}</li>
            `);
            jsonList.append(listItem);
        });

        // Event Listener for selecting an object
        jsonList.find('li').off('click').on('click', function() {
            const path = $(this).data('path');
            const name = getDisplayName(path);
            loadSelectedObjectIntoEditor(path, name);
        });
    }

    /* ------------------- Add JSON File Functionality ------------------- */

    /**
     * Opens the "Add JSON File" modal.
     */
    function openAddJsonModal() {
        const addJsonList = $(`#${PREFIX}add-json-list`);
        addJsonList.empty();

        // Determine which predefinedObjects are not already in the sidebar
        const existingKeys = Object.keys(currentConfig.site || {});
        const availableObjects = predefinedObjects.filter(obj => !existingKeys.includes(obj));

        if (availableObjects.length === 0) {
            // If no available objects, inform the user
            addJsonList.append(`<li style="color: #e0e1dd; cursor: default; padding: 12px 18px; border-radius: 6px;">All predefined JSON files have been added.</li>`);
        } else {
            // Populate the list with availableObjects
            availableObjects.forEach(obj => {
                const displayName = `${obj}.json`;
                const listItem = $(`
                    <li data-object="${obj}">${escapeHtml(displayName)}</li>
                `);
                addJsonList.append(listItem);
            });

            // Event Listener for selecting an object to add
            addJsonList.find('li[data-object]').off('click').on('click', function() {
                const objName = $(this).data('object');
                addJsonFileToSidebar(objName);
            });
        }

        // Show the add JSON modal
        const addJsonOverlay = $(`#${PREFIX}add-json-overlay`);
        const addJsonContainer = addJsonOverlay.find(`.${PREFIX}add-json-modal-container`);

        // Remove any existing animation classes
        addJsonOverlay.removeClass('hide').addClass('show');
        addJsonContainer.removeClass('close').addClass('open');

        $('body').css('overflow', 'hidden'); // Prevent background scrolling
    }

    /**
     * Closes the "Add JSON File" modal.
     */
    function closeAddJsonModal() {
        const addJsonOverlay = $(`#${PREFIX}add-json-overlay`);
        const addJsonContainer = addJsonOverlay.find(`.${PREFIX}add-json-modal-container`);

        // Add closing animation classes
        addJsonContainer.removeClass('open').addClass('close');
        addJsonOverlay.removeClass('show').addClass('hide');

        // Allow the animation to play before hiding the overlay
        setTimeout(() => {
            addJsonOverlay.removeClass('hide').removeClass('show');
            $('body').css('overflow', 'auto'); // Restore scrolling
        }, 500); // Match animation duration
    }

    /**
     * Adds a selected JSON file to the sidebar and selects it.
     * @param {string} objName - The name of the JSON object to add.
     */
    function addJsonFileToSidebar(objName) {
        // Initialize the new JSON object in currentConfig.site
        currentConfig.site[objName] = {};

        // Refresh the JSON list in the sidebar
        populateJSONList();

        // Select the newly added JSON file
        const newPath = objName;
        const newDisplayName = getDisplayName(newPath);
        const newListItem = $(`.${PREFIX}json-list li[data-path="${newPath}"]`);
        newListItem.addClass('active').siblings().removeClass('active');

        // Load the new JSON into the editor
        loadSelectedObjectIntoEditor(newPath, newDisplayName);

        // Close the Add JSON modal
        closeAddJsonModal();

        // Show a success toast
        showToast(`${newDisplayName} has been added and is now selected.`, 'success');
    }

    /* ------------------- Fullscreen Toggle Functionality ------------------- */

    /**
     * Toggles the fullscreen mode for the modal container.
     * @param {boolean} enable - Whether to enable or disable fullscreen.
     */
    function toggleFullscreen(enable) {
        if (enable) {
            $(`.${PREFIX}modal-container`).addClass('fullscreen');
            $(`.${PREFIX}fullscreen-toggle`).attr('title', 'Exit Fullscreen');
            // Refresh CodeMirror to adjust to new size after animation
            setTimeout(() => {
                if (editor) editor.refresh();
            }, 500); // Match transition duration
        } else {
            $(`.${PREFIX}modal-container`).removeClass('fullscreen');
            $(`.${PREFIX}fullscreen-toggle`).attr('title', 'Toggle Fullscreen');
            // Refresh CodeMirror to adjust to new size after animation
            setTimeout(() => {
                if (editor) editor.refresh();
            }, 500); // Match transition duration
        }
    }

    /* ------------------- Search Functionality ------------------- */

    /**
     * Opens the custom search UI and initializes search.
     */
    function openCustomSearch() {
        const $searchContainer = $(`#${PREFIX}search-container`);
        const $searchInput = $(`#${PREFIX}search-input`);
        searchMatches = [];
        currentMatchIndex = -1;
        updateMatchCount();
        clearSearch(); // Clear previous search highlights
        $searchContainer.show();
        $searchInput.focus();
        performSearch(); // Re-execute the search with existing query
    }

    /**
     * Closes the custom search UI and clears highlights.
     */
    function closeCustomSearch() {
        const $searchContainer = $(`#${PREFIX}search-container`);
        $searchContainer.hide();
        $(`#${PREFIX}search-input`).val('');
        clearSearch();
    }

    /**
     * Clears the search highlights and resets search state.
     */
    function clearSearch() {
        editor.getAllMarks().forEach(mark => mark.clear());
        searchMatches = [];
        currentMatchIndex = -1;
        updateMatchCount();
        // Remove active line highlight
        if (activeLineMarker) {
            activeLineMarker.clear();
            activeLineMarker = null;
        }
        // Remove active match highlight
        if (activeMatchMarker) {
            activeMatchMarker.clear();
            activeMatchMarker = null;
        }
        // Do not clear the search input or hide the search UI
        $(`#${PREFIX}no-matches-message`).hide();
    }

    /**
     * Updates the match count display.
     */
    function updateMatchCount() {
        const total = searchMatches.length;
        const current = currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0;
        $(`#${PREFIX}match-count`).text(`${current}/${total}`);
    }

    /**
     * Performs the search based on the input query.
     */
    function performSearch() {
        const query = $(`#${PREFIX}search-input`).val().trim();
        if (!query) {
            clearSearch();
            updateMatchCount();
            return;
        }

        clearSearch(); // Clear previous search highlights

        const escapedQuery = escapeRegExp(query);
        const regex = new RegExp(escapedQuery, 'gi');
        const cursor = editor.getSearchCursor(regex, { line: 0, ch: 0 });
        const uniqueLines = new Set();

        while (cursor.findNext()) {
            const match = {
                from: cursor.from(),
                to: cursor.to()
            };
            searchMatches.push(match);
            const line = match.from.line;
            if (!uniqueLines.has(line)) {
                uniqueLines.add(line);
                // Highlight the matched word with a lighter highlight
                editor.markText(match.from, match.to, { className: "cm-search-highlight" });
            }
        }

        if (searchMatches.length === 0) {
            $(`#${PREFIX}no-matches-message`).text('No matches found.').show();
            updateMatchCount();
            return;
        } else {
            $(`#${PREFIX}no-matches-message`).hide();
        }

        currentMatchIndex = 0;
        scrollToMatch(currentMatchIndex);
        updateMatchCount();
    }

    /**
     * Scrolls to the specified match index and highlights the active line and active match word.
     * @param {number} index - The index of the match to scroll to.
     */
    function scrollToMatch(index) {
        if (index < 0 || index >= searchMatches.length) return;
        const match = searchMatches[index];
        const line = match.from.line;

        // Scroll the editor to the active match
        editor.scrollIntoView({ line: line, ch: 0 }, 100);

        // Set cursor to the active match
        editor.setCursor(match.from);

        // Remove previous active line highlight
        if (activeLineMarker) {
            activeLineMarker.clear();
        }

        // Highlight the active line
        const lineStart = { line: line, ch: 0 };
        const lineEnd = { line: line, ch: editor.getLine(line).length };
        activeLineMarker = editor.markText(lineStart, lineEnd, { className: "cm-active-line-highlight" });

        // Remove previous active match highlight
        if (activeMatchMarker) {
            activeMatchMarker.clear();
        }

        // Highlight the active match word prominently
        activeMatchMarker = editor.markText(match.from, match.to, { className: "cm-active-match-highlight" });

        updateMatchCount();
    }

    /**
     * Finds and scrolls to the next match.
     */
    function findNext() {
        if (searchMatches.length === 0) {
            // No action needed since 'No matches found' message is displayed
            return;
        }
        currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
        scrollToMatch(currentMatchIndex);
    }

    /**
     * Finds and scrolls to the previous match.
     */
    function findPrev() {
        if (searchMatches.length === 0) {
            // No action needed since 'No matches found' message is displayed
            return;
        }
        currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
        scrollToMatch(currentMatchIndex);
    }

    /* ------------------- Custom Search UI Event Listeners ------------------- */

    // Handle input event for live search
    $(document).on('input', `#${PREFIX}search-input`, function() {
        performSearch();
    });

    // Handle Enter key in search input for navigating to next match
    $(document).on('keydown', `#${PREFIX}search-input`, function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            findNext();
        }
    });

    // Handle Next button
    $(document).on('click', `#${PREFIX}search-next`, function() {
        findNext();
    });

    // Handle Prev button
    $(document).on('click', `#${PREFIX}search-prev`, function() {
        findPrev();
    });

    /* ------------------- JSON Editor Functions Continued ------------------- */

    // Already defined earlier

    /* ------------------- Helper Functions Continued ------------------- */

    // Already defined earlier

    /* ------------------- Selection Modal Functions Continued ------------------- */

    // Already defined earlier

    /* ------------------- Add JSON File Functionality Continued ------------------- */

    // Already defined earlier

    /* ------------------- Fullscreen Toggle Functionality Continued ------------------- */

    // Already defined earlier

    /* ------------------- Event Listeners ------------------- */

    // Close Main Modal Buttons
    modalOverlay.find(`.${PREFIX}close-modal`).off('click').on('click', hideModal);
    modalOverlay.find(`#${PREFIX}close-editor`).off('click').on('click', hideModal);

    // Save Button
    modalOverlay.find(`#${PREFIX}save-json`).off('click').on('click', saveJSON);

    // Close Sidebar Button
    modalOverlay.find(`.${PREFIX}close-sidebar`).off('click').on('click', hideModal);

    // Fullscreen Toggle Button
    modalOverlay.find(`.${PREFIX}fullscreen-toggle`).off('click').on('click', function() {
        const isFullscreen = $(`.${PREFIX}modal-container`).hasClass('fullscreen');
        toggleFullscreen(!isFullscreen);
    });

    // **Add Event Listener for Search Toggle Button**
    modalOverlay.find(`.${PREFIX}search-toggle`).off('click').on('click', function() {
        openCustomSearch();
    });

    // Add JSON File Button
    modalOverlay.find(`.${PREFIX}add-json-button`).off('click').on('click', function() {
        openAddJsonModal();
    });

    // Close Add JSON Modal Button
    addJsonModalOverlay.find(`.${PREFIX}close-add-json-modal`).off('click').on('click', closeAddJsonModal);

    // Close Modal by clicking outside the container
    $(document).on('click', function(event) {
        if ($(event.target).is(`#${PREFIX}modal-overlay`)) {
            hideModal();
        }
        if ($(event.target).is(`#${PREFIX}add-json-overlay`)) {
            closeAddJsonModal();
        }
    });

    // Handle closing the search UI when the main modal is closed
    $(document).on('click', `.${PREFIX}close-modal, #${PREFIX}close-editor`, function() {
        closeCustomSearch();
    });

    /* ------------------- Search Modal Initialization ------------------- */

    /**
     * Initializes the custom search UI.
     */
    function initializeCustomSearch() {
        // Initially hide the search UI
        $(`#${PREFIX}search-container`).hide();
    }

    /* ------------------- Initialize CodeMirror ------------------- */

    initializeCodeMirror();
    initializeCustomSearch();

/* ------------------- Disable Browser's Default Search ------------------- */

// Function to disable default browser search only when not focused on CodeMirror
function disableBrowserSearch() {
document.addEventListener('keydown', function(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlKey && (e.key === 'f' || e.key === 'F')) {
        // Only override the search if our JSON modal is visible
        if (!document.getElementById('ingrid-json-editor-modal-overlay') ||
            !$('#ingrid-json-editor-modal-overlay').is(':visible')) {
            return; // Let the browser's damn default search do its thing
        }
        // Check if the active element is inside a CodeMirror editor
        const activeElement = document.activeElement;
        const isInCodeMirror = $(activeElement).closest('.CodeMirror').length > 0;

        if (!isInCodeMirror) {
            e.preventDefault();
            openCustomSearch(); // Open our custom search UI
        }
    }
}, true);
}

// Call the function to disable browser search
disableBrowserSearch();

    /* ------------------- Handle Bookmarklet Trigger ------------------- */

    // Listen for the custom event triggered by the bookmarklet
    window.addEventListener('openJsonEditor', function(e) {
        loadJSONIntoEditor();
    }, false);

    /* ------------------- Expose Functions (Optional) ------------------- */

    // Expose functions to the page if needed
    unsafeWindow.IngridJSONConfigEditor = {
        openEditor: loadJSONIntoEditor,
        closeEditor: hideModal
    };

})();
