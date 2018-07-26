# Possible Improvements
This document highlights some problems in the Culturize App that we did not have the time to solve.
This is divided in several categories : 
  * UI/UX: Related to the general user experience
  * Features: Missing features
  * Bugs: Bugs that we know


## Possible UI/UX improvements

* The UI is a bit rough and does not adapt very well to small screen sizes/resolutions.
* Increase the width of the input forms of the main.html commit message/pr title/pr message fields.

## Features

* Clear cache:
  * The app could use a "clear cache" button. It would be available in both the login screen and the main menu, 
    and would delete the cookies and the /repo folder in the app's appdata folder. This could be useful to "hard reset" the app.
* Make the user unable to close the app when publishing, so he doesn't close it accidentally in the middle of the conversion.
* Instead of creating 1 big .htaccess file, create one .htaccess for each "document type" and save them in subdirectories named after the document type.
  This would improve the handling of files with multiple document types a lot by creating smaller files (which results in faster redirects).
    * Example: The user imports a CSV file (10k rows), the CSV file contains 2 row for each "article", 1 with a redirection for a document type "img", and one for a document type "data"
      * Now: 1 Big file (10k rows), saved in the subdirectory
      * After: 2 Smaller files (5k rows), saved in 2 subdirectories: img/ and data/
* Add an option to update the ClientID/ClientSecret without having to open the app's file. For now, if you remove your GitHub app "auth" and lose your client secret/client id, all copies
of the app that use theses will be unusable.
* Add support for CSV separated by ';' which are also a common type of CSV file. This can be easily implemented (just read the first line of the file and check if we find a ',' or a ';' first)

## Bugs

* Blocked UI
  * When processing very large files, the UI is blocked. This is due to how electron works: blocking the main process blocks the renderer process
  from rendering. The only way to solve this is to move the publishing action in a separate thread. 
