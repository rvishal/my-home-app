import { supabase } from '../supabase';
import { db, getHouseholdData, importHouseholdData } from '../db';
import { generateId, generateToken, deriveKey, encrypt, decrypt } from '../crypto';
import type { HouseholdSettings } from '../types';

export type HouseholdInfo = {
	id: string;
	name: string;
	role: 'owner' | 'member';
};

function createHouseholdStore() {
	let household = $state<HouseholdInfo | null>(null);
	let encryptionKey = $state<CryptoKey | null>(null);
	let isLoading = $state(false);

	async function fetchForUser(userId: string) {
		isLoading = true;
		const { data, error } = await supabase
			.from('household_members')
			.select('household_id, role, households(id, name)')
			.eq('user_id', userId)
			.single();

		if (error || !data) {
			household = null;
			isLoading = false;
			return;
		}

		const hh = (data.households as { id: string; name: string }[])[0];
		household = {
			id: hh.id,
			name: hh.name,
			role: data.role as 'owner' | 'member'
		};
		isLoading = false;
	}

	async function createHousehold(
		userId: string,
		name: string,
		passphrase: string
	): Promise<HouseholdInfo> {
		const id = generateId();
		const calendarToken = generateToken(32);

		const { error: hhError } = await supabase.from('households').insert({
			id,
			name,
			owner_id: userId,
			calendar_token: calendarToken
		});
		if (hhError) throw hhError;

		const { error: memberError } = await supabase.from('household_members').insert({
			household_id: id,
			user_id: userId,
			role: 'owner'
		});
		if (memberError) throw memberError;

		const salt = generateId().replace(/-/g, '');
		const key = await deriveKey(passphrase, salt);
		const { error: keyError } = await supabase.from('wrapped_household_keys').insert({
			household_id: id,
			user_id: userId,
			wrapped_key: salt,
			salt,
			algorithm: 'AES-GCM-PBKDF2'
		});
		if (keyError) throw keyError;

		const settings: HouseholdSettings = {
			householdId: id,
			name,
			backupEnabled: true,
			calendarToken,
			emailReminders: true,
			browserReminders: true,
			telegramBotToken: '',
			telegramChatId: '',
			telegramRemindersEnabled: false
		};
		await db.settings.put(settings);

		household = { id, name, role: 'owner' };
		encryptionKey = key;
		return household;
	}

	async function unlock(passphrase: string): Promise<boolean> {
		if (!household) return false;
		const { data: sessionData } = await supabase.auth.getSession();
		const userId = sessionData.session?.user?.id;
		if (!userId) return false;
		const { data, error } = await supabase
			.from('wrapped_household_keys')
			.select('salt')
			.eq('household_id', household.id)
			.eq('user_id', userId)
			.single();
		if (error || !data) return false;
		try {
			encryptionKey = await deriveKey(passphrase, data.salt);
			return true;
		} catch {
			return false;
		}
	}

	async function acceptInvite(token: string, userId: string, passphrase: string) {
		const { data: invite, error: inviteError } = await supabase
			.from('invite_tokens')
			.select('household_id, used_by, expires_at')
			.eq('token', token)
			.single();
		if (inviteError || !invite) throw new Error('Invalid invite token');
		if (invite.used_by) throw new Error('Invite already used');
		if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('Invite expired');

		const householdId = invite.household_id;

		const { data: existing } = await supabase
			.from('household_members')
			.select('*')
			.eq('household_id', householdId)
			.eq('user_id', userId)
			.single();
		if (!existing) {
			const { error } = await supabase.from('household_members').insert({
				household_id: householdId,
				user_id: userId,
				role: 'member'
			});
			if (error) throw error;
		}

		const { error: updateError } = await supabase
			.from('invite_tokens')
			.update({ used_by: userId })
			.eq('token', token);
		if (updateError) throw updateError;

		const { data: hh } = await supabase
			.from('households')
			.select('name')
			.eq('id', householdId)
			.single();

		const { data: keyRow } = await supabase
			.from('wrapped_household_keys')
			.select('salt')
			.eq('household_id', householdId)
			.single();
		if (!keyRow) throw new Error('Household encryption key not found');

		const key = await deriveKey(passphrase, keyRow.salt);
		const { error: keyError } = await supabase.from('wrapped_household_keys').insert({
			household_id: householdId,
			user_id: userId,
			wrapped_key: keyRow.salt,
			salt: keyRow.salt,
			algorithm: 'AES-GCM-PBKDF2'
		});
		if (keyError) throw keyError;

		household = { id: householdId, name: hh?.name ?? 'My Household', role: 'member' };
		encryptionKey = key;

		const settings = await db.settings.where('householdId').equals(householdId).first();
		if (!settings) {
			await db.settings.put({
				householdId,
				name: hh?.name ?? 'My Household',
				backupEnabled: true,
				calendarToken: generateToken(32),
				emailReminders: true,
				browserReminders: true,
				telegramBotToken: '',
				telegramChatId: '',
				telegramRemindersEnabled: false
			});
		}
	}

	async function createInvite(): Promise<string> {
		if (!household) throw new Error('No household');
		const user = (await supabase.auth.getSession()).data.session?.user;
		if (!user) throw new Error('Not authenticated');
		const token = generateToken(32);
		const { error } = await supabase.from('invite_tokens').insert({
			token,
			household_id: household.id,
			created_by: user.id
		});
		if (error) throw error;
		return token;
	}

	async function loadBackup(passphrase?: string) {
		if (!household) return;
		let key = encryptionKey;
		if (!key && passphrase) {
			const ok = await unlock(passphrase);
			if (!ok) return;
			key = encryptionKey;
		}
		if (!key) return;
		const { data, error } = await supabase.storage
			.from('backups')
			.download(`${household.id}/latest.enc`);
		if (error || !data) return;
		const text = await data.text();
		const plaintext = await decrypt(text, key);
		const payload = JSON.parse(plaintext);
		await importHouseholdData(payload);
	}

	async function saveBackup() {
		if (!household || !encryptionKey) return;
		const payload = await getHouseholdData(household.id);
		const ciphertext = await encrypt(JSON.stringify(payload), encryptionKey);
		const blob = new Blob([ciphertext], { type: 'application/octet-stream' });
		await supabase.storage.from('backups').upload(`${household.id}/latest.enc`, blob, {
			upsert: true
		});
	}

	function leave() {
		household = null;
		encryptionKey = null;
	}

	return {
		get household() {
			return household;
		},
		get encryptionKey() {
			return encryptionKey;
		},
		get isLoading() {
			return isLoading;
		},
		fetchForUser,
		createHousehold,
		unlock,
		acceptInvite,
		createInvite,
		loadBackup,
		saveBackup,
		leave
	};
}

export const householdStore = createHouseholdStore();
