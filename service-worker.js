const CACHE_NAME = "ridgely-v10";

const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/style.css?v=20260721",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/offline.html",
    "/images/august-super-sale.png?v=20260721",
    "/images/image.jpg?v=20260721",
    "/images/image-2.jpg?v=20260721",
    "/images/image-4.jpg?v=20260721"
];

self.addEventListener("install", event => {
    console.log("Service Worker Installed");

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(FILES_TO_CACHE);
            })
    );
    // Activate this service worker immediately so updates take effect
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    console.log("Service Worker Activated");

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log("Deleting old cache:", cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    // Take control of all clients as soon as this service worker activates
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;

    // Network First for webpages and HTML
    if (
        request.mode === "navigate" ||
        request.headers.get("accept")?.includes("text/html")
    ) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    return caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(
                                request,
                                networkResponse.clone()
                            );

                            return networkResponse;
                        });
                })
                .catch(() => {
                    return caches.match(request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }

                            return caches.match("/offline.html");
                        });
                })
        );

        return;
    }

    // For static assets (styles, scripts, images, fonts) use Network First
    const dest = request.destination;
    const isStaticAsset = ["style", "script", "image", "font"].includes(dest);

    if (isStaticAsset) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // Update cache with fresh response
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, networkResponse.clone());
                    });

                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(request);
                })
        );

        return;
    }

    // Default: Cache First for other requests
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then(networkResponse => {
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(
                                    request,
                                    networkResponse.clone()
                                );

                                return networkResponse;
                            });
                    });
            })
    );
});