// This file is responsible for orchestrating
// the whole 'publishing' process. 
// Explanation
/*
    0.  'request-publishing' IPC Event is fired, and caught in the main. 
         The function that handles this event then calls 'publish' below.
*/

import { PublishRequest, PublishRequestResult } from './../common/PublishObjects'
import { GitRepoManager } from './Git'
import { convertCSVtoHTACCESS } from './Converter/Converter'
import { ForkManager } from './Api/ForkManager'
import { ipcMain } from 'electron'
import { mainWindow } from './../main'
const isGithubUrl = require('is-github-url');
const octokit = require('@octokit/rest')()
const GitUrlParse = require('git-url-parse')

// Handle a publishing request
export async function publish(request: PublishRequest) 
{
    try
    {
        // Check the request for incorrect input
        console.log('Checking Request for incorrect input')
        await checkRequestInput(request)
        

        // Parse the url
        console.log('Parsing URL')
        let parsedURL = GitUrlParse(request.repoUrl);
        let destOwner = parsedURL.owner 
        let destName = parsedURL.name
        let prettyName = destOwner + '/' + destName
        console.log(
            'Parsed URL: owner: ' + destOwner 
            + ' name: ' + destName 
            + ' prettyName: ' + prettyName
        )


        // Convert the file
        let content = await convertCSVtoHTACCESS(request.csvPath)
        
        // Fork the goal repo if we don't own it
        console.log('Attempting to fork ' + prettyName)
        let forks = new ForkManager(request.token)
        let url = await forks.forkRepo(request.repoUrl)
        console.log('Successfully forked ' + prettyName + ' at "' + url + '"')

        // Prepare the repoManager 
        console.log('Preparing GitRepoManager instance')
        let manager = await prepareGitRepoManager(url,request.token)

        // Save the file
        console.log('Saving the .htaccess to the desired location')
        manager.saveStringToFile(content,'.htaccess',request.subdir)
        
        // Push the changes
        console.log('Pushing changes')
        await manager.pushChanges('Culturize import', 'master')
    
        // Make the pull request
        console.log('Creating pull request')
        await createPullRequest(request.token,destOwner,destName,'Pierre-vh','master',
            () => { return 'some title' }, () => { return 'some body' })
        
        sendRequestResult(
            new PublishRequestResult(true)
        )
    }
    catch(error)
    {
        sendRequestResult(
            new PublishRequestResult(false,error)
        )
    }
}

// Sends an IPC event to the renderer process
// to notify it that we are done.
function sendRequestResult(result: PublishRequestResult)
{
    mainWindow.webContents.send('publish-done',result)
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
            {
                console.error(error)
                reject('Failed to create the Pull Request.')
            }
            else 
                resolve()
        })
    })
}

// Checks the request for invalid information. For use
// within the publish function
function checkRequestInput(request: PublishRequest) : Promise<void>
{
    return new Promise<void>((resolve,reject) => {
        if(!isGithubUrl(request.repoUrl))
            reject('"' + request.repoUrl + '" is not a valid GitHub repository')

        else if((request.subdir.length > 0) && (!/^((\w)+)(((\/)(\w+))+)?$/.test(request.subdir)))
        {
            console.log('length: ' + request.subdir.length)
            reject('"' + request.subdir + '" is not a valid path')
        }
        
        else 
            resolve()
    })
}