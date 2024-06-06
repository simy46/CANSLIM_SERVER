import fs from 'fs';
import path from 'path';

export async function writeOnFile(relativePath, message) {
    const absolutePath = path.resolve(relativePath);
    return new Promise((resolve, reject) => {
        fs.appendFile(absolutePath, message, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
