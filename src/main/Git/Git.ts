// This file is reponsible for the interaction with Git, the command-line tool,
// through a npm package. 

import { app } from 'electron'
const GitUrlParse = require('git-url-parse')
const fs = require('fs')

const simpleGit = require('simple-git')

type LocalCopyUpdatedCallback = () => void
type PushDoneCallback = () => void

// This class is responsible to manage
// the local clone of a git repo owned
// by the current user.
export class GitRepoManager
{
    repoURL: string
    workingDir : string
    repoName : string
    ownerName : string
    repoDir : string
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
    public updateLocalCopy(callback: LocalCopyUpdatedCallback): void
    {
        this.hasRepo()  
        .then((result) => {
            if(result)
            {
                // We got a local copy, pull
                console.log('Local copy detected, trying to pull')
                simpleGit(this.repoDir).pull((err:any) => {
                    if(!err)
                        console.log('Pulled successfuly')
                    else 
                        console.log('Error while pulling')
                    callback()
                })
            }
            else 
            {
                // We don't have a local copy, clone.
                console.log('Local copy not detected, cloning')
                simpleGit(this.workingDir).clone(this.repoURL,undefined,() => {
                    console.log('Cloning complete') 
                    callback()
                })
            }
        })
        .catch((error) => {
            console.error('Error while trying to determine if we have a local copy of the repo')
            console.error(error)
            callback()
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
    public pushChanges(commitMessage: string, branch = 'master', callback: PushDoneCallback)
    {
        let url = this.makeGitHTTPSUrl();
        simpleGit(this.repoDir)
            .add('./*')
            .commit(commitMessage)
            .push(url,branch,callback())
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
                resolve(false) 
            else 
            {
                simpleGit(this.repoDir).checkIsRepo((error: Error,result: boolean) => {
                    if(error)
                        reject(error)
                    else 
                        resolve(result)
                })
            }
        })
    }

    // Creates one or more folder if they don't exist
    private createFoldersIfNeeded(filepath: string) 
    {
        if(!fs.existsSync(filepath))
        {
            fs.mkdirSync(filepath)
            console.log(filepath + ' did not exists, so I created it for you!')
        }
        else 
            console.log(filepath + ' already existed')
    }

}

