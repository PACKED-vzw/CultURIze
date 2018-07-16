// This file contains the functions & variables
// used by the main menu.

import { remote } from 'electron'
const dialog = remote.dialog
const currentWindow = remote.getCurrentWindow()

type FileFoundCallback = (success:boolean, errorMsg: string) => void

// This class contains the data of the current task.
class CurrentTaskObject
{
    filename: string 

    public hasSelectedFile() : boolean 
    {
        return (this.filename != '')
    }
}

let currentTask: CurrentTaskObject = new CurrentTaskObject()

// Opens the prompt for the user to look for a file
// The prompt window will be attached to the current window, which should
// be the main window.
export function lookForFile(callback: FileFoundCallback)
{
    dialog.showOpenDialog(
        currentWindow,
        {
            title:'Select a .csv file',
            filters: [
                {
                    name: 'Comma-separated values',
                    extensions: ['csv']
                }
            ],
            properties: ['openFile']
        },
        (files: string[]) => {
            if(files)
            {
                if(files.length != 1)
                    callback(false, 'Too many files selected!')
                else 
                {
                    currentTask.filename = files[0]
                    console.log(currentTask.filename)
                    callback(true,'')
                }
            }
            else 
                callback(false, 'No file selected!')
        }
    )
}
