// This files manages the logic for making a pull request to the repo containing the .htacces needed to redirect.

var querystring = require('querystring')
var https = require("https");

import { ApiConf } from './ApiConf'

export function createPullRequest(token:string)
{
    let postData =JSON.stringify({
        "client_id" : ApiConf.client_id,
        "client_secret" :ApiConf.client_secret,
        "title" : "test voor resolver pull-request",
        "head" : "BertSchoovaerts:master",
        "base" : "master",
        "body" : "blup",
        "token" : token
    });

    let post = {
        host: "api.github.com",
        path: "/repos/oSoc18/resolver/pulls",
        method: "POST",
        headers:
        {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
            "Accept": "application/json",
           "User-Agent" : "BertSchoovaerts"
        }
    };

    let req = https.request(post,(response:any)=>{
        let result = new String('');
        response.on('data', (data:string)=> {
            result+=data;
        });
        response.on('end', () => {
           // let json = JSON.parse(result.toString());
            console.log(response.statusCode);
            console.log(response.body)
        });
        response.on('error', (err:any) => {
            console.log("Error vieze snitch: "+ err.toString);
        });


    });
    console.log(postData)
    
    req.write(postData)
    req.end()

        


}