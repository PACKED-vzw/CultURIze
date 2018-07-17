// This file is reponsible for the interaction with Git, the command-line tool.
// simpleGit is used to make the interaction with Git easier.

import { app } from 'electron'
const GitUrlParse = require('git-url-parse')
const shellJs = require('shelljs')
const fs = require('fs')

const simpleGit = require('simple-git')

// This class is responsible to manage
// the local clone of a git repo owned
// by the current user.
export class GitRepoManager
{
    repoURL: string
    workingDir : string
    repoName : string
    ownerName : string
    repoDir : string    // workingDir + repoName
    token : string
    
    constructor(repoURL: string, token: string, workingDir: string = '')
    {
        this.repoURL = repoURL
        this.token = token
        if(workingDir == '')
            this.workingDir = app.getPath('userData') + '\\repo'
        else 
            this.workingDir = workingDir

        // RepoName
        let parsedURL = GitUrlParse(this.repoURL);
        this.repoName = parsedURL.name
        this.ownerName = parsedURL.owner
        this.repoDir = this.workingDir + '\\' + this.repoName 

        this.createFoldersIfNeeded(this.workingDir)

        //console.log('GitRepoManager Initialisation complete.')
        //console.log(this)
    }

    // This will clone the repo if we don't have a local copy yet
    // or will run a pull if we have a local copy.
    // The callback is called once the operation is completed. 
    public updateLocalCopy(): Promise<void>
    {
        return new Promise<void>((resolve,reject) => {
            this.hasRepo()  
            .then((result) => {
                if(result)
                {
                    console.log('Local copy detected, pulling changes')
                    // Note, if we start to allow different branches,
                    // we'll need to pull/checkout the correct branch
                    // through simpleGit
                    simpleGit(this.repoDir).pull((err:any) => {
                        if(err == null)
                        {
                            console.log('Pull successful')
                            resolve()
                        }
                        else 
                        {
                            console.error(err)
                            reject('Error while pulling')
                        }
                    })
                }
                else 
                {
                    // We don't have a local copy, clone.
                    console.log('No local copy detected - Cloning')
                    simpleGit(this.workingDir).clone(this.repoURL,undefined,(err:any) => {
                        if(err == null)
                        {
                            console.log('Cloning success')
                            resolve()
                        }
                        else 
                        {
                            console.error(err)
                            reject('Failed to clone "' + this.repoURL + '"')
                        }
                    })
                }
            })
            .catch((error) => {
                console.error(error)
                reject('Error while attempting to determine if "' + this.repoDir + '" is a repository')
            })
        })   
    }

    // Save the content of a string (often the .htaccess file)
    // to a subdir in the repo. This will overwrite the file if it already
    // exists.
    public saveStringToFile(fileContent: string, fileName: string, subDir: string = '') 
    {
        let outFolderPath = this.repoDir + '/' + subDir
        let outFilePath = outFolderPath + '/' +  fileName
        this.createFoldersIfNeeded(outFolderPath)
        fs.writeFileSync(outFilePath,fileContent)
    }

    // This will call Git Commit/Push to send every change to the remote.
    public pushChanges(commitMessage: string, branch = 'master') : Promise<void>
    {
        return new Promise<void>((resolve,reject) => {
            let url = this.makeGitHTTPSUrl();
            simpleGit(this.repoDir)
                .add('./*')
                .commit(commitMessage)
                .push(url,branch, (err:any) => {
                    if(err != null)
                    {
                        console.error(err)
                        reject('Failed to push changes')
                    }
                    else
                        resolve()
                })
        })
    }

    // Creates the https url of the repo for git to use.
    private makeGitHTTPSUrl()
    {        
        return `https://${this.ownerName}:${this.token}@github.com/${this.ownerName}/${this.repoName}.git`;
    }

    // Will return true if the current workingDir contains a repo,
    // false if not.
    // The promise is rejected on error.
    private hasRepo(): Promise<boolean> 
    {
        return new Promise<boolean>((resolve,reject) => {
            if(!fs.existsSync(this.repoDir))
            {
                console.log('"' + this.repoDir + '" does not exists, so it can\'t contain a repo.')
                resolve(false) 
            }
            else 
            {
                console.log('"' + this.repoDir + '" exists, checking if it\'s a repo')
                simpleGit(this.repoDir).checkIsRepo((error: Error,result: boolean) => {
                    if(error)
                    {
                        console.error(error)
                        reject('Error while checking if "' + this.repoDir + '" is a repository')
                    }
                    else 
                    {
                        if(result)
                            console.log('"' + this.repoDir + '" is a repository')
                        else 
                            console.log('"' + this.repoDir + '" is not a repository')
                        resolve(result)
                    }
                })
            }
        })
    }

    // Creates one or more folder if they don't exist
    private createFoldersIfNeeded(filepath: string) 
    {
        console.log('Creating if needed :"' + filepath + '"')
        if(!fs.existsSync(filepath))
            shellJs.mkdir('-p',filepath)
    }

}

