import React from 'react';

import type { PostImageProps } from './PostImage';

/** Meta's public image CDN supports CORS: anonymous requests don't send Facebook cookies. */
export function isMetaImage(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === 'https:' && ['fbcdn.net', 'cdninstagram.com'].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function PostImage({ uri, onError }: PostImageProps) {
  return (
    <img
      src={uri}
      alt=""
      crossOrigin={isMetaImage(uri) ? 'anonymous' : undefined}
      referrerPolicy="no-referrer"
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={onError}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}
