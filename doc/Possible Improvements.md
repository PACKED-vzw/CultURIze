# Possible Improvements

## Purpose of this document
This document highlights some problems in the Culturize App that we did not have the time to solve.
This is divided in several categories : 
  * UI/UX: Related to the general user experience
  * Features: Missing features
  * Bugs: Bugs that we know

## Problems

### UI/UX

* The UI is a bit rough and does not adapt very well to small screen sizes/resolutions.

### Features

* Clear cache:
  * The app could use a "clear cache" button. It would be available in both the login screen and the main menu, 
  and would delete the cookies and the /repo folder in the app's appdata folder.
* Make the user unable to close the app when publishing, so he doesn't close it accidentally in the middle of the conversion.

### Bugs

* Blocked UI
  * When processing very large files, the UI is blocked. This is due to how electron works: blocking the main process blocks the renderer process
  from rendering. The only way to solve this is to move the publishing action in a separate thread. 
