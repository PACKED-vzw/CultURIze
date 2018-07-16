// This class encapsulates the data of a publishing requests from the user
export class PublishRequest
{
    csvPath : string 
    subdir  : string
    repoUrl : string

    constructor(csv: string, dir: string, url: string)
    {
        this.csvPath = csv 
        this.subdir = dir 
        this.repoUrl = url
    }

    public hasSelectedFile() : boolean 
    {
        return (this.csvPath != '')
    }
}
