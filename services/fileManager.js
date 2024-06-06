import fs from 'fs';
import path from 'path';

export async function writeOnFile(message) {
    const logFilePath = path.resolve('./logs/logs.txt');
    const dir = path.dirname(logFilePath);

    console.log(logFilePath)
    console.log(dir)

    return new Promise((resolve, reject) => {
        // Ensure the directory exists
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
                return reject(err);
            }

            // Write to the file
            fs.appendFile(logFilePath, message, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
}
