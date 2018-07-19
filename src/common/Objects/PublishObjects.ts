import { User } from './UserObject'

// This class encapsulates the data of a publishing requests from the user
export class PublishRequest {
    csvPath: string;
    subdir: string;
    repoUrl: string;
    branch: string;
    commitMsg: string;
    prTitle: string;
    prBody : string
    user: User;

    // Note: the Constructor doesn't take the user as argument because
    // the full user object is not available to the main process (which creates this object),
    // the user field is filled by the main process upon reception of the 'request publish'.
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

    public hasUser(): boolean {
        return (this.user != null);
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
