import { Octokit } from "@octokit/rest";
import { Version } from "../../common/Objects/Version";

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

export async function getDefaultBranch(octokit: Octokit, repoOwner: string, repoName: string): Promise<string> {
    const repo = await octokit.repos.get({
        owner: repoOwner,
        repo: repoName,
    });
    return repo.data.default_branch;
}
