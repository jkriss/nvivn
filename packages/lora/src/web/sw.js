const version = '3'
self.addEventListener('install', function(event) {
  console.log('got install event:', event)
  event.waitUntil(
    caches.open(version).then(function(cache) {
      return cache.addAll(['/', '/bundle.js']).catch(console.error)
    })
  )
})

self.addEventListener('fetch', function(event) {
  console.log('fetch event:', event)
  console.log('url:', event.request.url)
  event.respondWith(
    caches.match(event.request).then(function(resp) {
      if (resp && !navigator.onLine) {
        return resp
      } else {
        return fetch(event.request)
          .then(function(response) {
            return response
          })
          .catch(function(err) {
            if (resp) return resp
          })
      }
    })
  )
})
