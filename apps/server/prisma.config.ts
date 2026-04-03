import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import {defineConfig} from 'prisma/config'

const nodeEnv = process.env.NODE_ENV?.trim() || undefined
const envFiles = [
    path.resolve('.env'),
    ...(nodeEnv ? [path.resolve(`.env.${nodeEnv}`)] : []),
    ...(nodeEnv !== 'test' ? [path.resolve('.env.local')] : []),
    ...(nodeEnv ? [path.resolve(`.env.${nodeEnv}.local`)] : []),
]

for (const envFile of [...new Set(envFiles)]) {
    if (fs.existsSync(envFile)) {
        dotenv.config({ path: envFile, override: false })
    }
}

export default defineConfig({
    schema: path.join('prisma', 'schema.prisma'),
    migrations: {
        path: path.join('prisma', 'migrations'),
        seed: 'tsx prisma/seed.ts',
    },
})
