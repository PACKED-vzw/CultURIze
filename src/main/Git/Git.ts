/**
 * @file This file is reponsible for interacting with the Git command line tool.
 */
import log = require("electron-log");
import fs = require("fs");
import GitUrlParse = require("git-url-parse");
import path = require("path");
import simpleGit, {ResetMode, SimpleGit} from "simple-git";
import { User } from "./../../common/Objects/User";


/**
 * This class is responsible for managing a local copy of a
 * GitHub repository.
 * It provides the following functionality:
 *
 *      Updating a local copy: This will clone or reset+pull the repo
 *
 *      Pushing: This will add/commit/push to the repo.
 *
 * Note that the current user must have write access to the repo you're
 * trying to manage!
 */
export class GitRepoManager {
    public repoURL: string;
    public HTTPSRepoURL: string;
    public workingDir: string;
    public repoName: string;
    public ownerName: string;
    public repoDir: string;
    public user: User;
    public branch: string;

    /**
     * @constructor
     * @param {string} repoURL The URL of the repo that's going to be cloned.
     * @param {string} branch  The branch of the repo that should be checked out/pushed to
     * @param {string} user   The user
     * @param {string} workingDir (optional) The working directory where we'll operate
     * If "workingDir" is not provided, the default directory will be localed in %appdata%/(application name)/repo/
     */
    constructor(repoURL: string, branch: string, user: User, workingDir: string) {
        this.repoURL = repoURL;
        this.user = user;
        this.branch = branch;
        this.workingDir = workingDir;

        // Parse the URL to retrieve the repoName & username
        const parsedURL = GitUrlParse(this.repoURL);
        this.repoName = parsedURL.name;
        this.ownerName = parsedURL.owner;
        this.repoDir = path.join(this.workingDir, this.repoName);
        this.HTTPSRepoURL = this.makeGitHTTPSUrl();

        // If it doesn't exists, create the working directory.
        this.createFoldersIfNeeded(this.workingDir);
    }

    /**
     * This function will done one of 2 things:
     *
     * If we already have a local copy of the repo, it'll
     * do "git checkout (this.branch)" + "git reset --hard" + "git pull"
     *
     * Else, it'll clone the repo and checkout the correct branch.
     * @returns A Promise, which is resolved once the operation is completed, rejected (with an error message) on error.
     */
    public async updateLocalCopy(): Promise<void> {
        const result: boolean = await this.hasRepo();
        if (result) {
            log.info("Local copy detected, pulling changes");
            // TODO if the git repository is empty and does not have an initial commit
            // then this does not work.  we get a crash with user
            // message "Preparing GIT" which is not helpfull at all for
            // an enduser. this error is due to there not being a
            // master until we make the initial commit.

            const git = simpleGit(this.repoDir);
            await git.checkout(this.branch);
            try {
                await git.reset(ResetMode.HARD);
            } catch (error) {
                log.error(`Failed to reset local copy of the repo. Error msg: ${error}`);
                throw error;
            }
            try {
                await git.pull();
                log.info("pull successful");
            } catch (error) {
                log.error(`Failed to pull. Error msg: ${error}`);
                throw error;
            }
        } else {
            log.info("No local copy detected - Cloning");
            let git = simpleGit(this.workingDir);
            try {
                await git.clone(this.HTTPSRepoURL);
                log.info(`Cloning success of repo located at ${this.repoDir}`);
            } catch (error) {
                log.error(`Failed to clone ${this.repoURL}, error messag: ${error}`);
                throw error;
            }
            git = simpleGit(this.repoDir);
            try {
                await git.checkout(this.branch);
                log.info("Checkout Success");
            } catch (error) {
                log.error(`Failed to checkout branch ${error}`);
                throw error;
            }
        }
    }

    /**
     * Save the "fileContent" string in a file called "fileName"
     * in a directory of the repo"subDir".
     *
     * If the file already exists, it'll be deleted.
     *
     * @param {string} fileContent The string to be written to the file
     * @param {string} fileName    The name of the file
     * @param {string} subDir      The subdirectory of the repo where the file will be saved (will be created if needed)
     */
    public saveStringToFile(fileContent: string, fileName: string, subDir: string = "") {
        const outFolderPath = this.repoDir + "/" + subDir;
        const outFilePath = outFolderPath + "/" +  fileName;
        this.createFoldersIfNeeded(outFolderPath);
        fs.writeFileSync(outFilePath, fileContent);
    }

    /**
     * Runs "git add *", "git commit -m (commitMessage)" and "git push (url) (branch".
     * This will push every local change to the remote.
     * @param commitMessage The message of the commit that'll be created.
     * @returns A Promise, which is resolved on success, rejected (with an error message) on error.
     */
    public async pushChanges(commitMessage: string): Promise<void> {
        try {
            const git = simpleGit(this.repoDir);
            await git.add("./*");
            await git.commit(commitMessage);
            await git.push(this.HTTPSRepoURL, this.branch);
        } catch (error) {
            log.error(`Failed to push changes. ${error}`);
            throw error;
        }
    }

    /**
     * Utility function that'll generate a git https url, used to authenticate with the CLI git tool.
     *
     * The url has the following form: https:://username:token@github.com/owner/repo.git
     *
     * @returns the generated URL
     */
    private makeGitHTTPSUrl() {
        return `https://${this.user.userName}:${this.user.token}@github.com/${this.ownerName}/${this.repoName}.git`;
    }

    /**
     * Checks if "repoDir" contains a repo. This will check using 1 of 2 ways:
     *
     * 1st = Check if the "repoDir" folder exists. If it doesn't exists, return false
     *
     * 2nd = If "repoDir" exists, use "simpleGit.hasRepo" to check if it contains a valid GitHub repository.
     *
     * @returns a Promise, resolved with a boolean value (true = repo exists, false otherwise) on success,
     * throws an exception on error.
     */
    private async hasRepo(): Promise<boolean> {
        if (!fs.existsSync(this.repoDir)) {
            log.warn(`"${this.repoDir}" does not contain a repository`);
            return false;
        } else {
            const git = simpleGit(this.repoDir);
            const result: boolean = await git.checkIsRepo();
            if (result) {
                log.info(`"${this.repoDir}" is a repository"`);
            } else {
                log.info(`"${this.repoDir}" does not contain a repository`);
            }
            return result;
        }
    }

    /**
     * Utility function that creates one or more subdirectory if they do not exist.
     * @param {string} filepath The folder path that must be created
     */
    private createFoldersIfNeeded(filepath: string) {
        if (!fs.existsSync(filepath)) {
            fs.mkdirSync(filepath, {recursive: true});
        }
    }

}
