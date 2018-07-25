## Introduction

This file contains instruction for whoever wants to setup a fork of this project and distribute it to others.

#### Responsabilities

By distributing a version of this application, you'll be the only one responsible for managing your server and your GitHub repo.
Losing the server means losing the permanent identifiers. You need to be able to sustain the server for a long period of time, and responsibly
manage your GitHub repo.


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
  * `cd culturizeapp`
  
### 2. Downloading the dependencies
 Once you have completed the previous steps, you should have a command prompt open with the current working directory being the `culturizeapp` folder. If that's the case, type `npm install`. This will download everything you need in for the app to work.
  
### 3. Obtaining API Keys and Configuring the app
 Naviguate to the `culturizeapp` folder in your file explorer, go to `src` and locate `culturize.conf.example.ts`, duplicate this file and remove the `.example`. You should now have 2 files `culturize.conf.example.ts` and `culturize.conf.ts`. Open `culturize.conf.ts` with your favorite editor and locate theses 2 lines:
 
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
  
  You WILL need to fill theses values with your API keys. To obtain API Keys, follow the step on this page: [this page](https://github.com/settings/applications/new). 
  Now, fill the form with the following information:
   * **Application Name:** CulturizeApp (*Note: you can use a variation of the name, or even use your organization's name. It does not matter*)
   * **Homepage URL:** If you have a website, use your website's URL, if you don't, use the link to the GitHub repo of the project.
   * **Application Description:** Again, you're free to type what you want. Usually, you'll want to mention that this is a fork/variation of the Culturize App.
   * **Authorization callback URL:**
     This is a bit more important, you'll need to type `https://localhost`. Do not use any other URL.
     
  
 
 
