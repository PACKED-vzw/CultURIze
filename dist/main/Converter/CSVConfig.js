"use strict";
// This file contains some csv-related configuration
// options
Object.defineProperty(exports, "__esModule", { value: true });
// The identifier of the object/thing
exports.COL_PID = 'PID';
// The url it should resolves to
exports.COL_URL = 'URL';
// The 0/1 field that says if the redirection should be 
// active or not
exports.COL_ENABLED = 'enabled';
// The document type field.
exports.COL_DOCTYPE = 'document type';
// The document type of URLS that needs to be redirected when the header
// is 'text/html'
exports.ACCEPT_HTML_DOCTYPE = 'data';
// The document type of URLS that needs to be redirected when the header
// is 'image/*'
exports.ACCEPT_IMAGE = 'representation';
