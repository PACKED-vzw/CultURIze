// This file is responsible for orchestrating
// the whole 'publishing' process. 
// Explanation
/*
    0.  'request-publishing' IPC Event is fired, and caught below. 
         The function that handles this event then calls beginPublishing.
*/

import { ipcMain } from 'electron';
import { PublishRequest } from './../common/PublishObjects'
import { GitRepoManager } from './Git'

ipcMain.on('request-publishing',(event: Event, request: PublishRequest) => {
    console.log(request.csvPath + ',' + request.repoUrl + ',' + request.subdir)
})

// Handle a publishing request
function beginPublishing(request: PublishRequest) 
{
    console.log(request)
    // To-Do: Figure out how the token should be passed
    // to this file.
    // Using a global variable maybe? Or nodejs global
}

// Prepares an instance of the GitRepoManager class.
// The promise resolves once the cloning/pulling process of the
// local copy of the repo is done. Rejected (with the error message) on error.
function prepareGitRepoManager(repoURL: string, token: string) : Promise<GitRepoManager>
{
    return new Promise<GitRepoManager>((resolve,reject) => {
        let grm = new GitRepoManager(repoURL, token)
        grm.updateLocalCopy((success: boolean, msg: string) => {
            if(success)
                resolve(grm)
            else 
                reject(msg)
        })
    })
}
