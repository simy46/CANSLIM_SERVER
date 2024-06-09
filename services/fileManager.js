import fs from 'fs';
import path from 'path';


export async function writeOnFile(message) {
    const logFilePath = path.resolve('./logs/logs.txt');
    return new Promise((resolve, reject) => {
        fs.appendFile(logFilePath, message, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
