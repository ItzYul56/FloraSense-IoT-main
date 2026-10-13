self.addEventListener('install', (event) => {
  console.log('FloraSense Service Worker instaled');
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now. In production, we can cache API responses here.
  event.respondWith(fetch(event.request));
});
