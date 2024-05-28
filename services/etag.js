import crypto from 'crypto'

function generateETag(content) {
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(content));
    return `"${hash.digest('hex')}"`;
}

export { generateETag }