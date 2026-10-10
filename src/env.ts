import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: {
		public: true,
		static: true
	},
	PUBLIC_SUPABASE_ANON_KEY: {
		public: true,
		static: true
	},
	SUPABASE_SERVICE_ROLE_KEY: {
		public: false,
		static: true
	},
	RESEND_API_KEY: {
		public: false,
		static: false
	},
	VAPID_PUBLIC_KEY: {
		public: true,
		static: true
	},
	VAPID_PRIVATE_KEY: {
		public: false,
		static: true
	}
});
