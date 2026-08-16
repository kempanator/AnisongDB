"""Normalized song, anime, season, and media-link filters."""

import re
from dataclasses import dataclass
from functools import cache

from db_types import *

ALL_SONG_TYPES = frozenset({1, 2, 3})
ALL_BROADCASTS = frozenset({"Normal", "Dub", "Rebroadcast"})
CANONICAL_SONG_CATEGORIES = frozenset({"Standard", "Character", "Chanting", "Instrumental"})
OTHER_SONG_CATEGORY = "Other"
ALL_SONG_CATEGORIES = CANONICAL_SONG_CATEGORIES | {OTHER_SONG_CATEGORY}
CANONICAL_ANIME_TYPES = frozenset({"TV", "Movie", "OVA", "ONA", "Special"})
OTHER_ANIME_TYPE = "Other"
ALL_ANIME_TYPES = CANONICAL_ANIME_TYPES | {OTHER_ANIME_TYPE}
SEASON_ORDER = {"Winter": 0, "Spring": 1, "Summer": 2, "Fall": 3}


def normalize_song_category(value: str | None) -> str:
    """Map DB songCategory to a filter bucket; No Category/unknown/missing become Other."""
    if value in CANONICAL_SONG_CATEGORIES:
        return value
    return OTHER_SONG_CATEGORY


def normalize_anime_type(value: str | None) -> str:
    """Map DB animeType to a filter bucket; Doujin/unknown/missing become Other."""
    if value in CANONICAL_ANIME_TYPES:
        return value
    return OTHER_ANIME_TYPE


@cache
def _season_index(value: str | None) -> int | None:
    """Map 'Season YYYY' to a comparable int; None if missing or malformed."""
    if not value:
        return None
    match = re.fullmatch(r"(Winter|Spring|Summer|Fall) (\d{4})", value.strip())
    if not match:
        return None
    return int(match.group(2)) * 4 + SEASON_ORDER[match.group(1)]


def _has_every_filter(selected, all_values) -> bool:
    """True when selected values cover the full known set, so filtering is unnecessary."""
    return all_values.issubset(selected)


def _value_matches_filter(value, selected, all_values) -> bool:
    """Return whether one row value is allowed by a selected filter list."""
    if not selected:
        return False
    if _has_every_filter(selected, all_values):
        return True
    return value in selected


@dataclass(frozen=True)
class MediaLinksRequirements:
    require_any: frozenset[str]
    require_all: frozenset[str]
    exclude: frozenset[str]

    def is_empty(self) -> bool:
        return not (self.require_any or self.require_all or self.exclude)

    def matches(self, song: SongFullRow) -> bool:
        available = {
            "audio": bool(song[COL_AUDIO]),
            "mq": bool(song[COL_MQ]),
            "hq": bool(song[COL_HQ]),
        }

        if self.require_any and not any(available[link_type] for link_type in self.require_any):
            return False
        if self.require_all and not all(available[link_type] for link_type in self.require_all):
            return False
        if any(available[link_type] for link_type in self.exclude):
            return False
        return True


@dataclass(frozen=True)
class SongFilters:
    song_types: frozenset[int]
    broadcasts: frozenset[str]
    song_categories: frozenset[str]
    anime_types: frozenset[str]
    season_start: str | None
    season_end: str | None
    difficulty_start: float | None
    difficulty_end: float | None
    include_no_difficulty: bool
    media_links: MediaLinksRequirements | None

    def matches_all(self) -> bool:
        """Return whether every known filter value is enabled."""
        return (
            _has_every_filter(self.song_types, ALL_SONG_TYPES)
            and _has_every_filter(self.broadcasts, ALL_BROADCASTS)
            and _has_every_filter(self.song_categories, ALL_SONG_CATEGORIES)
            and _has_every_filter(self.anime_types, ALL_ANIME_TYPES)
            and self.season_start is None
            and self.season_end is None
            and self.difficulty_start is None
            and self.difficulty_end is None
            and not self.include_no_difficulty
            and (self.media_links is None or self.media_links.is_empty())
        )

    def matches_row(self, song: SongFullRow) -> bool:
        """True when a raw songsFull row matches these filters."""
        if self.media_links is not None and not self.media_links.matches(song):
            return False

        if self.season_start or self.season_end:
            song_season = _season_index(song[COL_ANIME_VINTAGE])
            if song_season is None:
                return False

            start = _season_index(self.season_start)
            end = _season_index(self.season_end)
            if start is not None and end is not None and start > end:
                start, end = end, start
            if start is not None and song_season < start:
                return False
            if end is not None and song_season > end:
                return False

        difficulty = song[COL_SONG_DIFFICULTY]
        has_difficulty = difficulty is not None and difficulty > 0
        if self.difficulty_start is not None or self.difficulty_end is not None:
            if not has_difficulty:
                if not self.include_no_difficulty:
                    return False
            else:
                start = self.difficulty_start
                end = self.difficulty_end
                if start is not None and end is not None and start > end:
                    start, end = end, start
                if start is not None and difficulty < start:
                    return False
                if end is not None and difficulty > end:
                    return False
        elif self.include_no_difficulty and has_difficulty:
            return False

        if not _value_matches_filter(
            song[COL_SONG_TYPE], self.song_types, ALL_SONG_TYPES
        ):
            return False

        if not _value_matches_filter(
            normalize_song_category(song[COL_SONG_CATEGORY]),
            self.song_categories,
            ALL_SONG_CATEGORIES,
        ):
            return False

        if not _has_every_filter(self.broadcasts, ALL_BROADCASTS):
            is_dub = bool(song[COL_IS_DUB])
            is_rebroadcast = bool(song[COL_IS_REBROADCAST])
            if not is_dub and not is_rebroadcast:
                if "Normal" not in self.broadcasts:
                    return False
            elif is_dub and not is_rebroadcast:
                if "Dub" not in self.broadcasts:
                    return False
            elif not is_dub and is_rebroadcast:
                if "Rebroadcast" not in self.broadcasts:
                    return False
            elif "Dub" not in self.broadcasts and "Rebroadcast" not in self.broadcasts:
                return False

        if not _value_matches_filter(
            normalize_anime_type(song[COL_ANIME_TYPE]),
            self.anime_types,
            ALL_ANIME_TYPES,
        ):
            return False

        return True
