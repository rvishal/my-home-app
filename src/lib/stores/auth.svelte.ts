import { supabase } from '../supabase';
import type { AppUser } from '../types';

function createAuthStore() {
	let user = $state<AppUser | null>(null);
	let isLoading = $state(true);

	async function init() {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		user = session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null;
		isLoading = false;

		supabase.auth.onAuthStateChange((event: string, session) => {
			user = session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null;
		});
	}

	async function signUp(email: string, password: string) {
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error) throw error;
		if (data.user) user = { id: data.user.id, email: data.user.email ?? '' };
		return data;
	}

	async function signIn(email: string, password: string) {
		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;
		if (data.user) user = { id: data.user.id, email: data.user.email ?? '' };
		return data;
	}

	async function signOut() {
		await supabase.auth.signOut();
		user = null;
	}

	return {
		get user() {
			return user;
		},
		get isLoading() {
			return isLoading;
		},
		init,
		signUp,
		signIn,
		signOut
	};
}

export const auth = createAuthStore();
