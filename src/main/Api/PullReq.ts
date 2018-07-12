// This files manages the logic for making a pull request to the repo containing the .htacces needed to redirect.

var querystring = require('querystring')
var https = require("https");

import { ApiConf } from './ApiConf'

export function createPullRequest(token:string)
{
    let postData = querystring.stringify({
        "client_id" : ApiConf.client_id,
        "client_secret" :ApiConf.client_secret
    });

    let post = {
        host: "api.github.com",
        path: "/repos/BertSchoovaerts/w3id.org/pulls",
        method: "POST",
        headers:
        {
            'Content-Type' :'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
            "Accept": "application/json"
        }
    };

    let req = https.request(post,(response:any)=>{
        let result = new String('');
        response.on('data', (data:string)=> {
            result+=data;
        });
        response.on('end', () => {
            let json = JSON.parse(result.toString());
            console.log(json);
        });
        response.on('error', (err:any) => {
            console.log("Error vieze snitch: "+ err.toString);
        });


    })

        


}