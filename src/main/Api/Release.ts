/**
 * @file This file is tasked with retrieving the user information
 * using the GitHub API.
 */
const { Octokit } = require("@octokit/rest");
import log = require("electron-log");
import { User } from "../../common/Objects/UserObject";
import { Version } from "../../common/Objects/VersionObject";

/**
 * Uses the token to query the GitHub API to retreive latest release
 * @param {string} token The access token
 * @returns TODO
 */
export async function getLatestRelease(token: string): Promise<Version> {
    const octokit = new Octokit({
        auth: `token ${token}`,
    });
    const latestRelease = await octokit.repos.getLatestRelease({
        owner: "PACKED-vzw",
        repo: "CultURIze",
    });
    const versionTag = latestRelease.data.tag_name.substring(1);

    const version: Version = new Version(versionTag);
    version.print();

    return version;
}
