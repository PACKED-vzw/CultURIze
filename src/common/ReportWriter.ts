import { Action } from "./Objects/ActionRequest";
import { CSVRow } from "./Objects/CSVRow";

import fs = require("fs");

const header =
    `<!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <title>CultURIze conversion report</title>
        <!<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500&display=swap" rel="stylesheet">
        <style>

            /* 0. main layout */
            html {
                font-size: 1em;
            }

            *,
            *:before,
            *::after {
                box-sizing: inherit;
            }

            html,
            body {
                width: 100%;
                font-family: "Montserrat", "Geneva", sans-serif;
            }

            p {
                font-size: 1.2rem;
            }

            h1 {
                font-family: "Montserrat", "Geneva", sans-serif;
                color: #15B28E;
                font-size: 2.8rem;
            }

            /* 1. layout header */

            #hcontainer {
                margin: 1.5rem auto;
                width: 90%;
            }

            /* 1.1 buttons */

            #bcontainer {
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
            }

            button {
                background-color: #1CD2A7;
                border-radius: 8rem;
                padding: 1rem;
                font-size: 1rem;
                color: white;
                border: none;
                height: 1.5rem;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                margin-right: 0.5rem;
            }

            button:hover {
                background-color: rgb(81, 180, 157);
                transform: scale(0.85);
            }

            /* logos in flexbox */

            #logos {
                display: flex;
                flex-direction: row;
                justify-content: space-between !important;
            }

            #meemoo-logo {
                align-self: flex-start;
            }

            /* 2. layout results */

            #tresults {
                background-color: #F3F4F3;
                color: black;
                padding: 1rem;
                margin: 0 auto;
                margin-top: 1.2rem;
                width: 90%;
                border-radius: 1rem;
                border: 1px dashed black;
                border-spacing: 0px;
                table-layout: fixed;
            }

            th {
                font-size: 1.1rem;
            }

            th,
            td {
                border-bottom: 1px solid #8E8F92;
                border-right: 1px solid #8E8F92;
                padding: 0.5rem;
            }

            table > tbody > tr > td:last-child,
            table > tbody > tr > th:last-child {
                border-right: none !important;
            }

            table > tbody > tr:last-child > td {
                border-bottom: none !important;
            }

            table > tbody > tr > td:nth-child(2),
            table > tbody > tr > td:last-child {
                text-align: center;
            }

            table > tbody > tr > *:nth-child(2) {
                width: 10% !important;
            }

            table > tbody > tr > *:nth-child(3) {
                width: 20% !important;
            }

            table > tbody > tr > *:last-child {
                width: 10%;
            }

            table > tbody > tr > *:nth-child(5) {
                max-width: 40%;
            }

            a {
                color: #15B28E;
            }

            .invalid,
            .error {
                background-color: #efd1d1;
            }

            .invalid td,
            .invalid a {
                color: red;
                font-weight: bold;
            }

            .error {
                font-size: 1.1rem;
                border: 2px solid red;
            }

            #tresults tr > *:nth-child(1) {
                display: none;
            }

        </style>
    </head>

    <body>
        <div id="hcontainer">
            <div id="logos">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="350" viewBox="0 0 717 308">
                    <defs>
                        <image id="image" width="705" height="308" xlink:href="data:img/png;base64,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" /> </defs>
                    <use x="7" xlink:href="#image" />
                    <use id="Layer_1_copy" data-name="Layer 1 copy" x="7" xlink:href="#image" /> </svg>
            </div>
            <h1>CSV Validation report</h1>
            <div id="rcontainer">
    `;

const h2 =
    `       </div>
            <div id="bcontainer">
                <button id="show-errors" class="filter-button"> <span>Only show errors</span></button>
                <button id="show-all" class="filter-button"> <span>Show all</span></button>
            </div>
        </div>
        <div id="tcontainer">
            <table id="tresults">
                <tbody id="tbody">
                <tr id="theader">
                    <th>ID</th>
                    <th>Enabled</th>
                    <th>Document Type</th>
                    <th>PID</th>
                    <th>URL</th>
                    <th>Affected cels</th>
                    <th>URL check</th>
                </tr>
    `;

const tableEnd =
    `       </tbody>
            </table>
        </div>
        <script>
    `;
const footer =
    `       document.getElementById("show-errors").onclick = function showErrors() {
                var lst = document.getElementsByClassName("valid");
                for (var i = 0; i < lst.length; i++) {
                    lst[i].style.display = "none";
                }
            };
            document.getElementById("show-all").onclick = function showAll() {
                var lst = document.getElementsByClassName("valid");
                for (var i = 0; i < lst.length; i++) {
                    lst[i].style.display = "";
                }
            };

        </script>
    </body>
    </html>
    `;


export function writeReport(action: Action, rows: CSVRow[], filename: string) {
    fs.writeFileSync(filename, header, {flag: "w"});
    let title: string = "";
    if (action === Action.publish) {
        title = `<p>Converted <span id="accepted">0</span> rows and rejected <span id="rejected">0</span>.</p>`;
    } else {
        title = ` <p>Checked <span id="accepted">0</span> rows and found <span id="rejected">0</span> errors.</p>`;
    }
    fs.writeFileSync(filename, title, {flag: "as"});
    fs.writeFileSync(filename, h2, {flag: "as"});

    let numAccepted = 0;
    let numRejected = 0;

    for (const row of rows) {
        fs.writeFileSync(filename, row.createHTMLRow(), {flag: "as"});
        if (action === Action.publish) {
            if (row.isValidAndEnabled()) {
                numAccepted += 1;
            } else {
                numRejected += 1;
            }
        } else {
            if (row.valid && row.urlWorking && row.duplicateOf === -1) {
                numAccepted += 1;
            } else {
                numRejected += 1;
            }
        }
    }
    fs.writeFileSync(filename, tableEnd, {flag: "as"});
    const script: string =
        `document.getElementById("accepted").textContent = ${action === Action.publish ? numAccepted : numAccepted + numRejected};
         document.getElementById("rejected").textContent = ${numRejected};`;
    fs.writeFileSync(filename, script, {flag: "as"});
    fs.writeFileSync(filename, footer, {flag: "as"});
}

