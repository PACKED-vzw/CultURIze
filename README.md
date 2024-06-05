# CultURIze

![CulturizeLogo](static/assets/logo-culturize-klein.png)

This is the GitHub repository for CultURIze.

## About

CultURIze is a four-step process to make persistent URI's for collection items, using a spreadsheet to record persistent URI's, a desktop app to turn it in a .htaccess (apache) or redirect configuration (nginx) file, and a Github repository to automate the deployment of apache based system for persistent URI's.

CultURIze is made for registrars, curators and managers of small to medium heritage collections.

More information about inspiration, governance, and howto's for setting up a Culturize workflow are available on the [Wiki](https://github.com/PACKED-vzw/CultURIze/wiki/home)

## CultURIze relies on

* a webserver: [Apache](https://httpd.apache.org/) or [Nginx](https://www.nginx.com/)
* [git](https://git-scm.com/), git can be used to track the history of the persistent
  URI'sapplications.
* [GitHub](https://github.com), we push the persistent URI's through GitHub API calls to a public or
  private GitHub repository.
* [Electron](https://www.electronjs.org/) to build cross platform applications.

## Getting Started

### For users

#### Download

You can download the [latest version of CultURIze here](https://github.com/PACKED-vzw/CultURIze/releases). We currently support Linux, Mac OSX and Windows.

#### Usage
Make sure Git is installed and configured on your system, check [here](https://github.com/PACKED-vzw/CultURIze/wiki/App-Installation-Instructions) for instructions.

Check out [the wiki](https://github.com/PACKED-vzw/CultURIze/wiki).

### For developers

#### Requirements

* [Node.js LTS](https://nodejs.org/en/)
* [npm](https://www.npmjs.com/get-npm) is normally distributed with Node.js, which means that when you download Node.js, you automatically get npm installed on your computer. You can update npm to the latest version with `npm install npm@latest -g`

#### Build from source

1. Clone this repository (or a fork of this repository)

    ```bash
    git clone https://github.com/packed-vzw/CultURIze.git
    ```

2. Install all dependencies

    ```bash
    cd CultURIze && npm install
    ```

3. Start the application

    ```bash
    npm start
    ```

4. Consult [the wiki](https://github.com/PACKED-vzw/CultURIze/wiki) before using CultURIze

#### Contributing

* [Coding Style](doc/Style.md): Read this before contributing to the project.
* [Bugs and Features idea list](https://github.com/PACKED-vzw/CultURIze/issues)
* [In-depth explanation of the internal flow of the desktop application](doc/pdf/flow.pdf)
* Source code: the Source code for the HTML pages is contained in the [static](static/) folder, and the source code for the core logic in the [src](src/) folder.
  
## Authors

* [oSoc18](https://2018.summerofcode.be/culturize.html) team: Bert Schoovaerts, Pierre Van Houtryve, Marie Devos, Milena Vergara Santiago
* [OKBE](https://openknowledge.be/): Brecht Van de Vyvere, Eveline Vlassenroot
* [PACKED](https://www.packed.be/): Bert Lemmens, Alina Saenko, Lode Scheers, Nastasia Vanderperren
* [Deuse](https://www.deuse.be): Maxime Deuse
* [Linux Belgium](http://linuxbe.com/): Douwe De Bock

## Acknowledgements

Inspired by [w3id.org](http://w3id.org)

## License


All content in this repository is released under the [CC-BY-SA License](https://creativecommons.org/licenses/by-sa/4.0/).

The code of CultURIze is released under the [MIT License](https://opensource.org/licenses/MIT).
