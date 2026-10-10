export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			households: {
				Row: {
					id: string;
					name: string;
					owner_id: string;
					calendar_token: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					owner_id: string;
					calendar_token: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					owner_id?: string;
					calendar_token?: string;
					created_at?: string;
				};
			};
			household_members: {
				Row: {
					household_id: string;
					user_id: string;
					role: 'owner' | 'member';
					joined_at: string;
				};
				Insert: {
					household_id: string;
					user_id: string;
					role: 'owner' | 'member';
					joined_at?: string;
				};
			};
			invite_tokens: {
				Row: {
					token: string;
					household_id: string;
					created_by: string;
					expires_at: string | null;
					used_by: string | null;
					created_at: string;
				};
				Insert: {
					token: string;
					household_id: string;
					created_by: string;
					expires_at?: string | null;
					used_by?: string | null;
					created_at?: string;
				};
				Update: {
					token?: string;
					household_id?: string;
					created_by?: string;
					expires_at?: string | null;
					used_by?: string | null;
					created_at?: string;
				};
			};
			wrapped_household_keys: {
				Row: {
					household_id: string;
					user_id: string;
					wrapped_key: string;
					salt: string;
					algorithm: string;
					created_at: string;
				};
				Insert: {
					household_id: string;
					user_id: string;
					wrapped_key: string;
					salt: string;
					algorithm?: string;
					created_at?: string;
				};
				Update: {
					household_id?: string;
					user_id?: string;
					wrapped_key?: string;
					salt?: string;
					algorithm?: string;
					created_at?: string;
				};
			};
			push_subscriptions: {
				Row: {
					id: string;
					household_id: string;
					user_id: string;
					subscription: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					household_id: string;
					user_id: string;
					subscription: Json;
					created_at?: string;
				};
				Update: {
					id?: string;
					household_id?: string;
					user_id?: string;
					subscription?: Json;
					created_at?: string;
				};
			};
		};
		Views: {};
		Functions: {};
		Enums: {};
		CompositeTypes: {};
	};
}
