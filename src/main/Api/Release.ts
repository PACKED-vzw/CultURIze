/**
 * @file This file is tasked with retrieving the user information
 * using the GitHub API.
 */
//const { Octokit } = require("@octokit/rest");
import { Octokit } from "@octokit/rest";
import log = require("electron-log");
import { User } from "../../common/Objects/UserObject";
import { Version } from "../../common/Objects/VersionObject";

/**
 * Uses the token to query the GitHub API to retreive latest release
 * @param {string} token The access token
 * @param {Octokit} initiated octokit object
 * @returns {Version} version object
 */
export async function getLatestRelease(octokit: Octokit): Promise<Version> {
    const latestRelease = await octokit.repos.getLatestRelease({
        owner: "PACKED-vzw",
        repo: "CultURIze",
    });
    const versionTag = latestRelease.data.tag_name.substring(1);

    const version: Version = new Version(versionTag);

    return version;
}
