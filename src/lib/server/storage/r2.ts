import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = env;
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';

const isPlaceholder = (val: string) =>
	!val || val.startsWith('your_') || val === 'your_account_id';

let _client: S3Client | null = null;
let _clientChecked = false;

function getClient(): S3Client | null {
	if (_clientChecked) return _client;
	_clientChecked = true;

	if (isPlaceholder(R2_ACCOUNT_ID) || isPlaceholder(R2_ACCESS_KEY_ID) || isPlaceholder(R2_SECRET_ACCESS_KEY)) {
		console.warn('[R2] Storage credentials not configured — using local dev storage');
		return null;
	}

	_client = new S3Client({
		region: 'auto',
		endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
	});

	return _client;
}

const BUCKET = R2_BUCKET_NAME || 'foto-app-bucket';
const LOCAL_DIR = resolve('static/dev-uploads');

export async function uploadFile(
	key: string,
	body: Buffer | Uint8Array,
	contentType: string
): Promise<string> {
	const client = getClient();

	if (!client) {
		// Dev fallback: save to static/dev-uploads/
		const localPath = resolve(LOCAL_DIR, key);
		mkdirSync(dirname(localPath), { recursive: true });
		writeFileSync(localPath, body);
		return key;
	}

	await client.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType
		})
	);

	return key;
}

export function getPublicUrl(key: string): string {
	// If R2 credentials aren't configured, use local dev API regardless of R2_PUBLIC_URL value
	if (isPlaceholder(R2_ACCOUNT_ID) || isPlaceholder(R2_ACCESS_KEY_ID) || isPlaceholder(R2_SECRET_ACCESS_KEY)) {
		return `/api/dev-image/${key}`;
	}
	if (isPlaceholder(R2_PUBLIC_URL) || !R2_PUBLIC_URL) {
		return `/api/dev-image/${key}`;
	}
	return `${R2_PUBLIC_URL}/${key}`;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 600): Promise<string> {
	const client = getClient();
	if (!client) return getPublicUrl(key);

	const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
	return getSignedUrl(client, command, { expiresIn });
}

export async function getFileBuffer(key: string): Promise<Buffer | null> {
	const client = getClient();

	if (!client) {
		// Dev fallback: read from local
		const localPath = resolve(LOCAL_DIR, key);
		if (existsSync(localPath)) return readFileSync(localPath);
		return null;
	}

	try {
		const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
		if (!response.Body) return null;

		const chunks: Uint8Array[] = [];
		for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	} catch {
		return null;
	}
}

export async function deleteFile(key: string): Promise<void> {
	const client = getClient();

	if (!client) {
		// Dev fallback: remove from local storage
		const localPath = resolve(LOCAL_DIR, key);
		if (existsSync(localPath)) {
			unlinkSync(localPath);
		}
		return;
	}

	await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
