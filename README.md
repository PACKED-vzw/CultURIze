![CulturizeLogo](https://github.com/PACKED-vzw/CultURIze/blob/master/static/assets/logo-culturize-klein.png)

This is the GitHub repo for Culturize.

## License
Copyright (c) 2019 PACKED vzw.

All content in this repository is released under the [CC-BY-SA License](https://creativecommons.org/licenses/by-sa/4.0/).
The code of the Culturize Desktop App is released under the [MIT License](https://opensource.org/licenses/MIT).
## About
CultURIze is a four-step process to make persistent URI's for collection items, using a spreadsheet to record persistent URI's, a desktop app to turn it in a .htaccess file, and a Githubrepo/CircleCI script to automate the configuration of an Apache webserver.

CultURIze is made for registrars, curators and managers of small to medium heritage collections. 

More information about inspiration, governance, and howto's for setting up a Culturize workflow are available on the [CultURIze Wiki](https://github.com/PACKED-vzw/CultURIze/wiki/home) 

## CultURIze relies on
* an [Apache webserver](https://httpd.apache.org/)
* a Github account
* a [CircleCI](https://circleci.com/) account
* [Electron](https://electronjs.org/)
* [Typescript](https://www.typescriptlang.org/)

## Getting Started

## Windows ##
(Windows installer instructions)

## Linux/Mac ##
## Introduction ##

This file contains instruction for whoever wants to setup a fork of this project and distribute it to others.
https://github.com/PACKED-vzw/CultURIze/wiki
## How to setup a fork of the Culturize App

### 0. What you'll need
  * [Git](https://git-scm.com/) *(Used both to clone the repo, and as a dependency of the Culturize App that isn't downloaded by npm)*
  * [Node.js](https://nodejs.org/en/)
  * 15 minutes of your time

### 1. Fork the Repo on GitHub, and clone it on your local machine.
  To fork the repo, click on the "Fork" button in the top right corner.
  ![How-to-fork](https://github-images.s3.amazonaws.com/help/bootcamp/Bootcamp-Fork.png)
  
  Once it's done, navigate to your fork's page on GitHub and click on the green "Clone or Download" button and copy the link.
  
  Now, open your command prompt, navigate to your working directory and type the following commands:
  
  * `git clone` and paste your fork's url.
  * `cd CultURIze`
  
### 2. Downloading the dependencies
 Once you have completed the previous steps, you should have a command prompt open with the current working directory being the `CultURIze` folder. If that's the case, type `npm install`. This will download everything you need in for the app to work. Since the release of Ubuntu 18 however you will need to manually install libconf-2.so.4 `sudo apt install libgconf2-4`.
  
### 3. Obtaining API Keys and Configuring the app
 Navigate to the `CultURIze` folder in your file explorer, go to `src` and locate `culturize.conf.example.ts`, duplicate this file and remove the `.example`. You should now have 2 files `culturize.conf.example.ts` and `culturize.conf.ts`. Open `culturize.conf.ts` with your favorite editor and locate theses 2 lines:
 
 ``` 
  /**
    * The client ID given by GitHub when you registered the app.
    * @static 
    */
   static clientID: string = "";

   /**
    * The client secret given by GitHub when you registered the app.
    * @static 
    */
   static clientSecret: string = "";
  ```
  
  You WILL need to fill theses values with your API keys. To obtain API Keys, go to [this page](https://github.com/settings/applications/new). 
  Now, fill the form with the following information:
   * **Application Name:** CulturizeApp (*Note: you can use a variation of the name, or even use your organization's name. It does not matter*)
   * **Homepage URL:** If you have a website, use your website's URL, if you don't, use the link to the GitHub repo of the project.
   * **Application Description:** Again, you're free to type what you want. Usually, you'll want to mention that this is a fork/variation of the Culturize App.
   * **Authorization callback URL:**
     This is a bit more important, you'll need to type `https://localhost`. Do not use any other URL.
     
  Once you click "Register Application", you should have your Client ID and Client Secret right in front of you. Copy them and paste them between the quotes in their respective place in the config file. The final result should look like this:
  ![Keys](https://i.imgur.com/2myN9ok.png)
  
Now, save the file and close it.

### 4. Checking if everything works
  Go back to your command prompt and type `npm start`. You should see some commands being run and a few seconds later, you should be greeted with a screen like this:
  ![loginpage](https://i.imgur.com/U4w0ESB.png)
 
Try to click the login button, after a few seconds, a popup should appear, prompting you to fill in your credentials. When you're done, click on "Sign-In". The popup should close automatically and you should be redirected to this page:

 ![mainpage](https://i.imgur.com/QgDo800.png)
 
 If that's the case, congratulation! The hardest part is done! Else, if you get a login error even if your credentials were correct, review what you did in step 3 carefully. Maybe your API keys are not valid!
 
 ### 5: Hosting
 #### A: Use an existing solution
   * If your file are small enough (<100 redirections), you can use a existing organisation's GitHub repo such as [W3ID's](https://github.com/perma-id/w3id.org). 
   Just paste this link in the "Push the changes to:" field when using the app and you'll be good to go! But be aware, you won't control what goes in the repo. They will decide if they want to accept your changes or not, and they might refuse!
 
 #### B: Your own solution
 * 1. Create a new GitHub repo where users will be able to make Pull Requests
   This is simple as the repo does not require any boilerplate. Just create a new GitHub repo. If you want your repo to be the default one for the users of your fork, you can go in the `culturize.conf.ts` file and locate the `repo` variable in `PublishFormDefaults`. Copy-paste the link to your repo between the quotes and now your repo should be the default one that the users will see when opening the app.

 * 2. Setup continuous integration between your repo and a server
   You'll probably want to have the changes live as soon as possible once the server is updated. For that, you can setup CI solution such as [CircleCI](https://circleci.com/docs/2.0/). **Also:** Don't forget [to allow mod_rewrite on your Apache server!](https://www.digitalocean.com/community/tutorials/how-to-rewrite-urls-with-mod_rewrite-for-apache-on-ubuntu-16-04) 
   
### 6: Packaging/Distributing the App
 * We don't provide ways of packaging the app (creating installer/executables) by default. To package the app and distribute it, you might be interested in the following resources:
   * https://electronjs.org/docs/tutorial/application-distribution
   * https://github.com/unindented/electron-installer-windows
   * https://github.com/electron-userland/electron-packager


## Contributing
  * [Coding Style](doc/Style.md): Read this before contributing to the project.
  * [Bugs and Features idea list](doc/Possible%20Improvements.md)
  * [In-depth explanation of the internal flow of the desktop application](doc/pdf/flow.pdf)
  * Source code: the Source code for the HTML pages is contained in the [static](static/) folder, and the source code for the core logic in the [src](src/) folder. 
  
## Authors
  * [oSoc18](https://2018.summerofcode.be/culturize.html) team: Bert Schoovaerts, Pierre Van Houtryve, Marie Devos, Milena Vergara Santiago
  * [OKBE](https://openknowledge.be/): Brecht Van de Vyvere, Eveline Vlassenroot
  * [PACKED](https://www.packed.be/): Bert Lemmens, Alina Saenko, Lode Scheers, Nastasia Vanderperren
  * Deuze: Maxime Deuze
## Acknowledgements
  * inspired by [w3id.org](http://w3id.org)

