export function generateId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export function generateToken(length = 32): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function generateSalt(length = 16): string {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits',
		'deriveKey'
	]);
	const saltBytes = hexToBytes(salt);
	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: saltBytes as BufferSource,
			iterations: 100_000,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
	const encoder = new TextEncoder();
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
	const combined = new Uint8Array(iv.length + (ciphertext as ArrayBuffer).byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(ciphertext as ArrayBuffer), iv.length);
	return bytesToHex(combined);
}

export async function decrypt(ciphertextHex: string, key: CryptoKey): Promise<string> {
	const data = hexToBytes(ciphertextHex);
	const iv = data.slice(0, 12);
	const ciphertext = data.slice(12);
	const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
	const decoder = new TextDecoder();
	return decoder.decode(decrypted);
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return bytesToHex(new Uint8Array(hashBuffer));
}
