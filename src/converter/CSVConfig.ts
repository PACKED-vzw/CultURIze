// This file contains some csv-related configuration
// options

// The identifier of the object/thing
export const COL_PID = 'PID'

// The url it should resolves to
export const COL_URL = 'URL'

// The 0/1 field that says if the redirection should be 
// active or not
export const COL_ENABLED = 'enabled'

// The document type field.
export const COL_DOCTYPE = 'document type'

// The document type of URLS that needs to be redirected when the header
// is 'text/html'
export const ACCEPT_HTML_DOCTYPE = 'data'

// The document type of URLS that needs to be redirected when the header
// is 'image/*'
export const ACCEPT_IMAGE = 'representation'