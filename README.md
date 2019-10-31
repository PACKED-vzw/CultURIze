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
### 0. What you'll need
  * [Git](https://git-scm.com/) *(Used both to clone the repo, and as a dependency of the Culturize App that isn't downloaded by npm)*
  * 5 minutes of your time

### 1. Configure your git client
Make sure your git is configured properly, to do this you can execute the following code
in you windows console.

```
git config --global user.email "youremail@gmail.com"

git config --global user.username "yourusername"
```

This is a very important step, if you do not do this the Culturize app will not work.
  
### 2. Run the Executable
Run the windows executable located in the folder `/release-builds`.

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
  
### 3. Obtaining Github personal access key
 The app uses a personal access token to authenticate en authorize with github.
 You can generate a github personal access token with repo scope on
 https://github.com/settings/tokens/new
 Make sure that the "repo" checkbox is checked. The node field can be used the
 name the key.
     
  Once you click "generate token", you should have your personal access token
  right in front of you. Copy it and paste it in the login screen of the
  application.

### 4. Checking if everything works
  Go back to your command prompt and type `npm start`. You should see some
  commands being run and a few seconds later, you should be greeted with a login
  screen.
 
  Fill in your personal access token here and click validate. If everything is
  correct you should be redirected to this page:

 ![mainpage](https://i.imgur.com/QgDo800.png)
 
 If that's the case, congratulation! The hardest part is done! Else, if you get
 a login error even if your access token was correct, review what you did in
 step 3 carefully. Maybe you didn't select the correct scope.
 
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

