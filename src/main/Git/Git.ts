// This file is reponsible for the interaction with Git, the command-line tool,
// through a npm package. 

import { app } from 'electron'
const fs = require('fs')

const simpleGit = require('simple-git')


type LocalCopyUpdatedCallback = () => void

// This class is responsible to manage
// the local clone of a git repo, which means
// -> if the clone does not exists, clone the repo
// -> if the clone exists, check if it's up to date and pull if needed.
export class CloneManager
{
    private repoURL: string
    private workingDir : string
    
    constructor(repoURL: string, workingDir: string = '')
    {
        this.repoURL = repoURL
        if(workingDir == '')
            this.workingDir = app.getPath('userData') + '/repo/'
        else 
            this.workingDir = workingDir

        // Check if the directory exists, else we'll need to create it
        if(!fs.existsSync(this.workingDir))
        {
            fs.mkdirSync(this.workingDir)
            console.log(this.workingDir + ' does not exists ')
        }
        else 
            console.log(this.workingDir + ' exists')
    }

    // This will clone the repo if we don't have a local copy yet
    // or will run a pull if we have a local copy.
    // The callback is called once the operation is completed.
    public updateLocalCopy(callback: LocalCopyUpdatedCallback): void
    {
        console.log('Current Working Directory: ' + this.workingDir)
        this.hasRepo()  
        .then((result) => {
            if(result)
            {
                // We got a local copy, pull
                console.log('Local copy detected, trying to pull')
                simpleGit(this.workingDir).pull(() => {
                    console.log('Pulled successfuly')
                })
            }
            else 
            {
                // We don't have a local copy, clone.
                console.log('Local copy not detected, cloning')
                simpleGit(this.workingDir).clone(this.repoURL,undefined,() => { console.log('Cloning complete') })
            }
            callback()
        })
        .catch((error) => {
            console.error('Error while trying to determine if we have a local copy of the repo')
            console.error(error)
            callback()
        })
        
    }

    // Will return true if the current workingDir contains a repo,
    // false if not.
    // The promise is rejected on error.
    public hasRepo(): Promise<boolean> 
    {
        return new Promise<boolean>((resolve,reject) => {
            simpleGit(this.workingDir).checkIsRepo((error: Error,result: boolean) => {
                if(error)
                    reject(error)
                else 
                    resolve(result)
            })
        })
    }
}