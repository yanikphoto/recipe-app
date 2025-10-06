import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
// FIX: Import Buffer to resolve 'Cannot find name 'Buffer'' error.
import { Buffer } from 'buffer';

// Temporary storage directory in a serverless environment
const TMP_DIR = '/tmp';
// How long to keep sync data before automatic deletion (in milliseconds)
const TTL = 5 * 60 * 1000; // 5 minutes

// In-memory map to manage cleanup timers for sync files
// FIX: Replace NodeJS.Timeout with ReturnType<typeof setTimeout> to avoid dependency on Node.js global types.
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

const setCleanup = (id: string) => {
    // Clear any existing timer for this ID to prevent duplicates
    if (cleanupTimers.has(id)) {
        clearTimeout(cleanupTimers.get(id)!);
    }
    // Set a new timer to delete the file after the TTL
    const timer = setTimeout(async () => {
        try {
            const filePath = path.join(TMP_DIR, `${id}.gz`);
            await fs.unlink(filePath);
            cleanupTimers.delete(id);
        } catch (error) {
            // It might have already been deleted, which is fine.
            // Only log errors that are not 'File Not Found'.
            // FIX: Replace NodeJS.ErrnoException with a generic type assertion to avoid dependency on Node.js global types.
            if ((error as { code?: string }).code !== 'ENOENT') {
                 console.error(`Error during scheduled cleanup for ${id}:`, error);
            }
        }
    }, TTL);
    cleanupTimers.set(id, timer);
};

export default async function handler(req: any, res: any) {
    if (req.method === 'POST') {
        // --- Store Data ---
        try {
            const { data } = req.body;
            if (!data) {
                return res.status(400).json({ error: 'Missing data payload.' });
            }

            const id = randomUUID();
            const filePath = path.join(TMP_DIR, `${id}.gz`);
            // The client sends data as a base64 string, so we decode it to a buffer
            const dataBuffer = Buffer.from(data, 'base64');

            await fs.writeFile(filePath, dataBuffer);
            setCleanup(id);

            return res.status(200).json({ id });

        } catch (error) {
            console.error('Error storing sync data:', error);
            return res.status(500).json({ error: 'Failed to store sync data.' });
        }
    } else if (req.method === 'GET') {
        // --- Retrieve Data ---
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid sync ID.' });
        }

        try {
            const filePath = path.join(TMP_DIR, `${id}.gz`);
            const fileData = await fs.readFile(filePath);

            // Clean up immediately after retrieval for one-time use
            await fs.unlink(filePath);
            if (cleanupTimers.has(id)) {
                clearTimeout(cleanupTimers.get(id)!);
                cleanupTimers.delete(id);
            }
            
            // Send the raw gzipped data back to the client
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Disposition', 'attachment; filename="sync.gz"');
            return res.status(200).send(fileData);
        } catch (error) {
            // FIX: Replace NodeJS.ErrnoException with a generic type assertion to avoid dependency on Node.js global types.
            if ((error as { code?: string }).code === 'ENOENT') {
                return res.status(404).json({ error: 'Sync data not found or has expired.' });
            }
            console.error('Error retrieving sync data:', error);
            return res.status(500).json({ error: 'Failed to retrieve sync data.' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
