/**
 * @file Contains the Version object
 */

 /**
  * This encapsulates the data of the GitHub user
  */
export class Version {
    private major: number;
    private minor: number;
    private micro: number;

    /**
     * @constructor
     * @param {string} versionTag
     */
    constructor(versionTag: string) {
        let dotIndex = versionTag.indexOf(".");
        this.major = Number(versionTag.substring(0, dotIndex));
        versionTag = versionTag.substring(dotIndex + 1);
        dotIndex = versionTag.indexOf(".");
        this.minor = Number(versionTag.substring(0, dotIndex));
        versionTag = versionTag.substring(dotIndex + 1);
        this.micro = Number(versionTag);
    }

    public print() {
        console.log(this.major, this.minor, this.micro);
    }

    public getVersion(): number[] {
        return [this.major, this.minor, this.micro];
    }

    public isNewer(other: Version): boolean {
        if (other.major > this.major) {
            return true;
        } else if (other.major < this.major) {
            return false;
        } else {
            if (other.minor > this.minor) {
                return true;
            } else if (other.minor < this.minor) {
                return false;
            } else {
                if (other.micro > this.micro) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    }
}
