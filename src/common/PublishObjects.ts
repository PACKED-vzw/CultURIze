// This class encapsulates the data of a publishing requests from the user
export class PublishRequest {
    public csvPath: string;
    public subdir: string;
    public repoUrl: string;
    public token: string;

    constructor(csv: string, dir: string, url: string, token: string = "") {
        this.csvPath = csv;
        this.subdir = dir;
        this.repoUrl = url;
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
    public successful: boolean;
    public error: string;

    constructor(successful: boolean, error: string = null) {
        this.successful = successful;
        this.error = error;
    }
}
