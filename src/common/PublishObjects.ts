// This class encapsulates the data of a publishing requests from the user
export class PublishRequest
{
    csvPath : string 
    subdir  : string
    repoUrl : string
    token : string

    constructor(csv: string, dir: string, url: string, token: string = '')
    {
        this.csvPath = csv 
        this.subdir = dir 
        this.repoUrl = url
    }
    
    public hasToken() : boolean 
    {
        return (this.token != '')
    }

    public hasSelectedFile() : boolean 
    {
        return (this.csvPath != '')
    }
}
