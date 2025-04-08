// ==UserScript==
// @name         Add ICS Location Set
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add ICS Location Set functionality triggered by ICS Management Interface
// @author       julpif
// @match        https://mad.ingrid.com/*
// @match        https://mad-stage.ingrid.com/*
// @updateURL    https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Add%20ICS%20Location%20Set.user.js
// @downloadURL  https://raw.githubusercontent.com/julpiff/tampermonkey-scripts/refs/heads/main/Add%20ICS%20Location%20Set.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Listen for the custom event to trigger the Add ICS Location Set modal
    window.addEventListener('triggerAddICSLocationSet', () => {
        addICSLocationSetModal();
    }, false);

    function addICSLocationSetModal() {
        if(!window.siteId || !window.authToken){
            alert("Site ID or Authorization token not found. Please ensure the API Token and Site ID Extractor script is running and has captured the necessary values.");
            return;
        }

        let e = "ingrid-create-";

        // Inject Font Awesome CSS
        let t = document.createElement("link");
        t.rel = "stylesheet";
        t.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        document.head.appendChild(t);

        // Inject custom styles
        let o = document.createElement("style");
        o.innerHTML = `
            /* Modal Overlay Styles */
            #${e}modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
                animation: fadeIn 0.3s;
            }
            /* Modal Container Styles */
            #${e}modal {
                background-color: #ffffff;
                padding: 25px 30px;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                box-shadow: 0 10px 20px rgba(0,0,0,0.15);
                position: relative;
                animation: slideIn 0.3s ease-out;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            /* Close Button */
            .${e}close-modal {
                position: absolute;
                top: 10px;
                right: 15px;
                color: #ffffff;
                background-color: #000000;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.3s, color 0.3s;
                z-index: 10001;
            }
            .${e}close-modal:hover,
            .${e}close-modal:focus {
                background-color: #333333;
                color: #ff0000;
            }
            /* Modal Header */
            #${e}modal h2 {
                text-align: center;
                margin-bottom: 20px;
                color: #ffffff;
                background-color: #000000;
                padding: 12px;
                border-radius: 10px 10px 0 0;
                font-size: 1.6em;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            /* Form Styles */
            #${e}import-form {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            #${e}import-form label {
                font-weight: bold;
                margin-bottom: 4px;
                display: block;
            }
            #${e}import-form input[type="text"],
            #${e}import-form input[type="file"] {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #cccccc;
                border-radius: 6px;
                font-size: 14px;
            }
            /* Buttons Container */
            #${e}button-container {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 15px;
            }
            /* Action Buttons Styles */
            .${e}modal-button {
                padding: 8px 16px;
                background-color: #000000;
                color: #ffffff;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .${e}modal-button:hover {
                background-color: #333333;
            }
            .${e}modal-button:active {
                background-color: #555555;
            }
            /* Spinner Styles */
            #${e}spinner {
                border: 6px solid #f3f3f3;
                border-top: 6px solid #000000;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
                display: none;
            }
            /* Result Display Styles */
            #${e}result {
                margin-top: 20px;
                max-height: 300px;
                overflow-y: auto;
                background-color: #f9f9f9;
                padding: 15px;
                border-radius: 4px;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: Consolas, monospace;
                font-size: 14px;
                display: none;
            }
            /* Keyframes for Animations */
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            /* Responsive Design */
            @media (max-width: 500px) {
                #${e}modal {
                    padding: 20px;
                }
                #${e}modal h2 {
                    font-size: 1.4em;
                }
                .${e}modal-button {
                    padding: 6px 12px;
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(o);

        // Inject Font Awesome JS
        let n = document.createElement("script");
        n.src = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js";
        n.defer = true;
        document.head.appendChild(n);

        // Create modal overlay
        let i = document.createElement("div");
        i.id = `${e}modal-overlay`;

        // Create modal container
        let a = document.createElement("div");
        a.id = `${e}modal`;

        // Create close button
        let r = document.createElement("span");
        r.className = `${e}close-modal`;
        r.innerHTML = "&times;";
        r.title = "Close";
        r.onclick = () => {
            if (document.body.contains(i)) {
                document.body.removeChild(i);
            }
        };
        a.appendChild(r);

        // Create modal header
        let l = document.createElement("h2");
        l.innerText = "Create Location Set";
        a.appendChild(l);

        // Create form
        let d = document.createElement("form");
        d.id = `${e}import-form`;

        // Name label and input
        let s = document.createElement("label");
        s.innerText = "Name:";
        s.htmlFor = `${e}name`;
        d.appendChild(s);

        let p = document.createElement("input");
        p.type = "text";
        p.id = `${e}name`;
        p.placeholder = "Enter Location Set Name";
        p.required = true;
        d.appendChild(p);

        // Shipping Method label and input
        let c = document.createElement("label");
        c.innerText = "Shipping Method:";
        c.htmlFor = `${e}shipping`;
        d.appendChild(c);

        let m = document.createElement("input");
        m.type = "text";
        m.id = `${e}shipping`;
        m.placeholder = "Enter Shipping Method";
        m.required = true;
        d.appendChild(m);

        // Result display
        let f = document.createElement("div");
        f.id = `${e}result`;
        a.appendChild(f);

        // Spinner
        let $ = document.createElement("div");
        $.id = `${e}spinner`;
        a.appendChild($);

        // Buttons container
        let h = document.createElement("div");
        h.id = `${e}button-container`;

        // Cancel button
        let u = document.createElement("button");
        u.type = "button";
        u.innerText = "Cancel";
        u.className = `${e}modal-button`;
        u.onclick = () => {
            if (document.body.contains(i)) {
                document.body.removeChild(i);
            }
        };
        h.appendChild(u);

        // Create button
        let x = document.createElement("button");
        x.type = "button";
        x.innerHTML = '<i class="fas fa-check-circle"></i> Create';
        x.className = `${e}modal-button`;

        // Function to display results
        function y(message, isError) {
            if(message){
                f.innerText = message;
                f.style.display = "block";
                f.style.color = isError ? "red" : "green";
            } else {
                f.innerText = "";
                f.style.display = "none";
            }
        }

        // Create button click handler
        x.onclick = async () => {
            let name = p.value.trim();
            let shipping = m.value.trim();

            if(!name || !shipping){
                y("Please enter both Name and Shipping Method.", true);
                return;
            }

            let apiUrl = "";
            let currentUrl = window.location.href;

            if(currentUrl.startsWith("https://mad.ingrid.com/")){
                apiUrl = "https://api.ingrid.com/v1/ombudinternal/methods/locationset.add";
            } else if(currentUrl.startsWith("https://mad-stage.ingrid.com/")){
                apiUrl = "https://api-stage.ingrid.com/v1/ombudinternal/methods/locationset.add";
            } else {
                y("Unsupported URL. This script works only on mad.ingrid.com or mad-stage.ingrid.com.", true);
                return;
            }

            let payload = {
                site_id: window.siteId,
                name: name,
                shipping_method: [shipping]
            };

            try {
                $.style.display = "block"; // Show spinner
                y("", false); // Clear previous messages

                let response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${window.authToken}`
                    },
                    body: JSON.stringify(payload)
                });

                $.style.display = "none"; // Hide spinner

                if(response.ok){
                    let result = await response.json();
                    y(`Location set created successfully with ID: ${result.id}. Please save this ID somewhere safe as it is needed to delete the location set (ICS).`, false);
                } else {
                    let errorText = await response.text();
                    y(`Error: ${response.status} - ${errorText}`, true);
                }
            } catch (error) {
                $.style.display = "none"; // Hide spinner
                y(`Request failed: ${error.message}`, true);
            }
        };

        h.appendChild(x);
        d.appendChild(h);
        a.appendChild(d);
        i.appendChild(a);
        document.body.appendChild(i);

        // Close modal when clicking outside
        i.addEventListener("click", function(event){
            if(event.target === i){
                document.body.removeChild(i);
            }
        });

        // Close modal on Escape key
        document.addEventListener("keydown", function(event){
            if(event.key === "Escape"){
                if(document.body.contains(i)){
                    document.body.removeChild(i);
                }
            }
        });
    }
})();
