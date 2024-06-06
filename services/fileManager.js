import fs from 'fs';
import path from 'path';


export async function writeOnFile(message) {
    const logFilePath = path.resolve('./logs/logs.txt');
    const dir = path.dirname(logFilePath);

    // Ensure the directory exists
    fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating directory:', err);
            return;
        }

        // Write to the file
        fs.writeFile(logFilePath, message, { flag: 'a' }, (err) => { // 'a' flag for appending
            if (err) {
                console.error('Error writing to file:', err);
            } else {
                console.log('Successfully written to file:', message);
            }
        });
    });
}

