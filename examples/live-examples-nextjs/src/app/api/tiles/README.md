# Tiles API Route

This API route (`/geoai-live/api/tiles/[...params]`) acts as a proxy for the Geobase titiler service, hiding the actual backend URL from the client.

## How it works

1. **Request**: Client makes a request to `/geoai-live/api/tiles/WebMercatorQuad/{z}/{x}/{y}?url=...&apikey=...`
2. **Proxy**: The API route forwards the request to the actual titiler service using the server-side `GEOBASE_TITILER` environment variable
3. **Response**: The tile data is returned to the client with appropriate caching headers

## Benefits

- **Security**: The actual titiler URL is hidden from the client
- **Caching**: Implements proper caching headers for tile requests
- **Error Handling**: Provides proper error responses for failed requests
- **Validation**: Validates tile paths to prevent invalid requests

## Environment Variables

- `GEOBASE_TITILER`: The actual titiler service URL (server-side only)

## Example Usage

```typescript
// Client-side tile URL (what the map uses)
const tileUrl = `/geoai-live/api/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${cogImagery}&apikey=${apikey}`;

// This gets proxied to:
// ${GEOBASE_TITILER}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}?url=${cogImagery}&apikey=${apikey}
```

## Caching

Tiles are cached with the following headers:
- `cache-control: public, max-age=3600, s-maxage=86400`
- Browser cache: 1 hour
- CDN cache: 24 hours
