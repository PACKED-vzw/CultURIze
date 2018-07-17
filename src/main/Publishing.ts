// This file is responsible for orchestrating
// the whole 'publishing' process. 
// Explanation
/*
    0.  'request-publishing' IPC Event is fired, and caught in the main. 
         The function that handles this event then calls publish.
*/

import { PublishRequest } from './../common/PublishObjects'
import { GitRepoManager } from './Git'
import { convertCSVtoHTACCESS } from './Converter/Converter'
import { dialog } from 'electron'

const path = require('path')

// Handle a publishing request
export async function publish(request: PublishRequest) 
{
    try
    {
        // Convert the file
        let content = await convertCSVtoHTACCESS(request.csvPath)

        // Todo: fork

        // Prepare the repoManager                  \/\/\/\/\/ Replace with fork url
        let manager = await prepareGitRepoManager(request.repoUrl,request.token)

        // Save the file
        manager.saveStringToFile(content,'.htaccess',request.subdir)

        // Push the changes
        await manager.pushChanges('Culturize import', 'master')
    
        // Todo: pull request
    }
    catch(error)
    {
        if(error != null)
        {
            console.log(error)
            dialog.showErrorBox('Publishing error',error)
        }
        else 
            console.error('Error caught, but the error is null!')
        //  todo: fire IPC event here to notify the error.
    }
}

// Prepares an instance of the GitRepoManager class.
// The promise resolves once the cloning/pulling process of the
// local copy of the repo is done. Rejected (with the error message) on error.
function prepareGitRepoManager(repoURL: string, token: string) : Promise<GitRepoManager>
{
    return new Promise<GitRepoManager>((resolve,reject) => {
        let grm = new GitRepoManager(repoURL, token)
        grm.updateLocalCopy()
            .then(() => { resolve(grm) })
            .catch((err:any) => { reject(err) })
    })
}
