import {Injectable} from '@nestjs/common';
import {randomBytes, createHash} from 'crypto';

function base64urlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
        .replace(/=/g, '') // Remove padding
        .replace(/\+/g, '-') // Replace '+' with '-'
        .replace(/\//g, '_');
}

@Injectable()
export class AuthService {
    generatePkce() {
        const codeVerifier = base64urlEncode(randomBytes(32));
        const codeChallenge = base64urlEncode(
            createHash('sha256').update(codeVerifier).digest()
        );
        return {codeVerifier, codeChallenge};
    }
}
