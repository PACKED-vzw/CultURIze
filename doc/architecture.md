# CultURIze application architecture

CultURIze uses a CSV file, which at least contains an URI, entity ID and a document type, to
generate a apache or nginx redirect configuration and pushes these configuration files to github.

The desktop application is build with electron, which allows us to build cross platform applications
with typescript, HTML and CSS. Electron applications contain chromium and node js to provide this
cross platform setup. Typescript is an extension to javascript which adds types that enable us to
catch errors sooner.


## File structure

* `src` contains the typescript source code
* `dist` is output directory of the typescript compiler
* `static` contains the html and css files to render the app

Starting point of the application is `main.ts` in the `src` directory. It checks whether the user is
already logged in to determine if we need to show the login screen or the main application screen.
Screens are displayed by loading one of the static HTML pages into an electron window. Actions in
the GUI are part of the renderer process, the application logic is part of the main process. Both
processes communicate with each other by IPC messages.

When a user enters data and selects one of the two possible actions the entered data is transformed
into a `ActionRequest` object and send to the main process. How an `ActionRequest` is handled in the
main process is described in the next section. Upon completion of the action an IPC message is send
to the renderer process which will show the result of the action. For the `publish` action this will
be a summary of the accepted and rejected data, for the `validate` this will be a report that show
the data and highlights the found errors.


## Data processing

An `ActionRequest` object always contains at least a path to a CSV file, for publishing the object
will also contain a sub directory and a target github repository. The data in the CSV file is
parsed to create a `CSVRow` array. The validation action will check the correctness of the data,
validate the availability of the provided URI and show the result of this check to the user.
Publishing will do a basic validity check, convert the data to a Apache or Nginx configuration,
write the web server configuration to a file in the github repository and sync the repository with
github.com.

