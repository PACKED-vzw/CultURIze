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
import { ForkManager } from './Api/ForkManager'
import { dialog } from 'electron'
const octokit = require('@octokit/rest')()
const GitUrlParse = require('git-url-parse')

// Handle a publishing request
export async function publish(request: PublishRequest) 
{
    try
    {
        // Parse the url
        let parsedURL = GitUrlParse(request.repoUrl);
        let destOwner = parsedURL.owner 
        let destName = parsedURL.name

        // Convert the file
        let content = await convertCSVtoHTACCESS(request.csvPath)

        // Todo: fork
        let forks = new ForkManager(request.token)
        let url = await forks.forkRepo(request.repoUrl)
        console.log('Completed, url:')

        // Prepare the repoManager 
        let manager = await prepareGitRepoManager(url,request.token)

        // Save the file
        manager.saveStringToFile(content,'.htaccess',request.subdir)

        // Push the changes
        await manager.pushChanges('Culturize import', 'master')
    
        await createPullRequest(request.token,destOwner,destName,'BertSchoovaerts','master',
            () => { return 'some title' }, () => { return 'some body' })
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


type StringProvider = () => string

function createPullRequest
    (token: string, owner:string, repo:string, user: string, branch:string,
     titleProvider: StringProvider, bodyProvider: StringProvider) : Promise<void>
{
    octokit.authenticate({
        type:'oauth',
        token:token
    })
    return new Promise<void>((resolve,reject) => {
        octokit.pullRequests.create({
            owner : owner,
            repo  : repo,
            title : titleProvider(), 
            head  : user + ':' + branch,
            body  : bodyProvider(),
            base  : branch,
        }, (error:any ,result:any) => {
            if(error != null)
                reject(error)
            else 
                resolve()
        })
    })
}
