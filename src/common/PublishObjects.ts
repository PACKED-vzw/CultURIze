// This class encapsulates the data of a publishing requests from the user
export class PublishRequest {
    csvPath: string;
    subdir: string;
    repoUrl: string;
    token: string;
    branch: string;
    commitMsg: string;
    prTitle: string;
    prBody : string

    // Note: the Constructor doesn't take the token as argument because
    // the token is not available to the renderer process (which creates this object),
    // the token field is filled by the main process upon reception of the event.
    constructor(csv: string, dir: string, url: string, 
    branch: string = "", commitMsg: string = "", prTitle: string = "", prBody: string = "") {
        this.csvPath = csv;
        this.subdir = dir;
        this.repoUrl = url;
        this.branch = branch;
        this.commitMsg = commitMsg
        this.prTitle = prTitle;
        this.prBody = prBody;
    }

    public hasToken(): boolean {
        return (this.token !== "");
    }

    public hasSelectedFile(): boolean {
        return (this.csvPath !== "");
    }
}

// This class encapsulates the result of a Publishing request.
export class PublishRequestResult {
    successful: boolean;
    error: string;

    constructor(successful: boolean, error: string = null) {
        this.successful = successful;
        this.error = error;
    }
}
