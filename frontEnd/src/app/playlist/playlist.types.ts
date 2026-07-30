export type Playlist = {
  id: string;
  name: string;
  createdOn: string;
  annSongIds: number[];
};

export type PlaylistAddResult =
  | 'added'
  | 'duplicate'
  | 'full'
  | 'invalid-song'
  | 'not-found';

export type PlaylistToggleResult = PlaylistAddResult | 'removed';

export type PlaylistAppendResult = {
  addedCount: number;
  duplicateCount: number;
  skippedForLimitCount: number;
};
