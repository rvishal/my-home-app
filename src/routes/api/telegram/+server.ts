import { json, error } from '@sveltejs/kit';

function base64ToBuffer(dataUrl: string): { buffer: Buffer; filename: string; mimeType: string } {
	const match = dataUrl.match(/^data:([^;]+);[^,]*base64,(.+)$/);
	if (!match) {
		throw new Error('Invalid data URL');
	}
	const mimeType = match[1];
	const base64 = match[2];
	const ext = mimeType.split('/')[1] || 'bin';
	const filename = `document.${ext}`;
	return { buffer: Buffer.from(base64, 'base64'), filename, mimeType };
}

export async function POST({ request }) {
	const body = await request.json();
	const { botToken, chatId, message, file } = body as {
		botToken?: string;
		chatId?: string;
		message?: string;
		file?: string;
	};

	if (!botToken || !chatId) {
		error(400, 'botToken and chatId are required');
	}

	const chat_id = String(chatId);

	try {
		if (file) {
			const { buffer, filename, mimeType } = base64ToBuffer(file);
			const form = new FormData();
			form.append('chat_id', chat_id);
			form.append('caption', message ?? '');
			form.append('document', new Blob([buffer as BlobPart], { type: mimeType }), filename);

			const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
				method: 'POST',
				body: form
			});
			const data = await res.json();
			if (!data.ok) {
				error(500, data.description || 'Telegram send failed');
			}
			return json({ ok: true, data });
		}

		if (message) {
			const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id,
					text: message,
					parse_mode: 'Markdown'
				})
			});
			const data = await res.json();
			if (!data.ok) {
				error(500, data.description || 'Telegram send failed');
			}
			return json({ ok: true, data });
		}

		error(400, 'message or file is required');
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Telegram request failed';
		error(500, message);
	}
}
