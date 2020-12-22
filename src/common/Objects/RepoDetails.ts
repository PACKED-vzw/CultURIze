/**
 * @file Contains the RepoDetails object
 */

import GitUrlParse = require("git-url-parse");
const isGithubUrl = require("is-github-url");

export class RepoDetails {
    private repoURL: string;
    private owner: string;
    private repo: string;
    private prettyName: string;

    /**
     * @constructor
     * @param {string} versionTag
     */
    constructor(repoURL: string) {
        if (!isGithubUrl(repoURL)) {
            throw new Error("not a github url");
        }
        this.repoURL = repoURL;
        const parsedURL = GitUrlParse(repoURL);

        this.owner = parsedURL.owner;
        this.repo = parsedURL.name;
        this.prettyName = this.owner + "/" + this.repo;
    }

    public getOwner() {
        return this.owner;
    }

    public getRepo() {
        return this.repo;
    }

    public getPrettyName() {
        return this.prettyName;
    }
}
