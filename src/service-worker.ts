/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = 'my-home-app-v1';
const STATIC_ASSETS = ['/', '/dashboard', '/homes', '/loans', '/schedules', '/settings'];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS);
		})
	);
	sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(sw.clients.claim());
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	if (event.request.url.includes('/api/')) return;

	event.respondWith(
		caches.match(event.request).then((cached) => {
			return (
				cached ||
				fetch(event.request).then((response) => {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
					return response;
				})
			);
		})
	);
});
