"""Public API request and response models."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

MAX_TEXT_FIELD_LENGTH = 500
SEASON_REGEX = r"^(Winter|Spring|Summer|Fall) \d{4}$"
EMPTY_FILTER_MESSAGES = {
    "song_types": "At least one song type filter (opening, ending, insert) must be enabled.",
    "broadcasts": "At least one broadcast type filter (normal, dub, rebroadcast) must be enabled.",
    "song_categories": "At least one performance filter (standard, character, chanting, instrumental, no_category) must be enabled.",
    "anime_types": "At least one anime type filter (tv, movie, ova, ona, special, doujin) must be enabled.",
}


class TextSearchFilter(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "search": "White Album",
                "partial_match": True,
                "match_case": False,
            }
        }
    )

    search: str = Field(..., max_length=MAX_TEXT_FIELD_LENGTH)
    partial_match: bool = True
    match_case: bool = False


class ArtistSearchFilter(TextSearchFilter):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "search": "fripSide",
                "partial_match": True,
                "match_case": False,
                "group_granularity": 1,
                "max_other_artist": 2,
            }
        }
    )

    # Min line-up members required on the song (0 = at least one). Above 0 also finds member credits
    group_granularity: int = Field(0, ge=0)
    # Max other performers on the song besides the match
    max_other_artist: int = Field(99, ge=0)


class ComposerSearchFilter(TextSearchFilter):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "search": "Hiroyuki Sawano",
                "partial_match": True,
                "match_case": False,
                "group_granularity": 0,
                "max_other_artist": 99,
                "arrangement": True,
            }
        }
    )

    # Same as ArtistSearchFilter
    group_granularity: int = Field(0, ge=0)
    max_other_artist: int = Field(99, ge=0)
    # Match arranger credits too, not only composer
    arrangement: bool = True


LinkType = Literal["audio", "mq", "hq"]
SongType = Literal["opening", "ending", "insert"]
BroadcastType = Literal["normal", "dub", "rebroadcast"]
SongCategory = Literal["standard", "character", "chanting", "instrumental", "no_category"]
AnimeType = Literal["tv", "movie", "ova", "ona", "special", "doujin"]


class MediaLinksFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    require_any: list[LinkType] = Field(default_factory=list)
    require_all: list[LinkType] = Field(default_factory=list)
    exclude: list[LinkType] = Field(default_factory=list)

    @field_validator("require_any", "require_all", "exclude", mode="before")
    @classmethod
    def normalize_link_types(cls, value):
        if value is None:
            return []
        if not isinstance(value, list):
            return value
        return [item.lower() if isinstance(item, str) else item for item in value]

    @model_validator(mode="after")
    def reject_impossible_requirements(self):
        required_any = set(self.require_any)
        required_all = set(self.require_all)
        excluded = set(self.exclude)
        if required_all & excluded:
            raise ValueError("A link type cannot be both required and excluded.")
        if required_any and required_any <= excluded:
            raise ValueError("At least one require_any link type must not be excluded.")
        return self


class SeasonFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: str | None = Field(None, max_length=11, pattern=SEASON_REGEX)
    end: str | None = Field(None, max_length=11, pattern=SEASON_REGEX)

    @model_validator(mode="after")
    def require_at_least_one_bound(self):
        if self.start is None and self.end is None:
            raise ValueError("A season range requires a start or end value.")
        return self


class DifficultyFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: float | None = Field(None, ge=0, le=100)
    end: float | None = Field(None, ge=0, le=100)
    include_no_difficulty: bool = False

    @model_validator(mode="after")
    def require_at_least_one_condition(self):
        if self.start is None and self.end is None and not self.include_no_difficulty:
            raise ValueError(
                "A difficulty filter requires a start, end, or include_no_difficulty."
            )
        return self


class SongFilterOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")

    song_types: list[SongType] = Field(
        default_factory=lambda: ["opening", "ending", "insert"],
        min_length=1,
    )
    broadcasts: list[BroadcastType] = Field(
        default_factory=lambda: ["normal", "dub", "rebroadcast"],
        min_length=1,
    )
    song_categories: list[SongCategory] = Field(
        default_factory=lambda: ["standard", "character", "chanting", "instrumental", "no_category"],
        min_length=1,
    )
    anime_types: list[AnimeType] = Field(
        default_factory=lambda: ["tv", "movie", "ova", "ona", "special", "doujin"],
        min_length=1,
    )
    season: SeasonFilter | None = None
    difficulty: DifficultyFilter | None = None
    media_links: MediaLinksFilter | None = None

    @field_validator("song_types", "broadcasts", "song_categories", "anime_types", mode="before")
    @classmethod
    def require_filter_selection(cls, value, info):
        if isinstance(value, list) and not value:
            raise PydanticCustomError(
                f"empty_{info.field_name}",
                EMPTY_FILTER_MESSAGES[info.field_name],
            )
        return value


class FilteredRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    filters: SongFilterOptions = Field(default_factory=SongFilterOptions)


class SearchRequest(FilteredRequest):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "anime_search_filter": {
                    "search": "White Album",
                    "partial_match": True,
                },
                "artist_search_filter": {
                    "search": "Madoka Yonezawa",
                    "partial_match": True,
                    "group_granularity": 0,
                    "max_other_artist": 99,
                },
                "filters": {
                    "song_types": ["opening", "ending"],
                    "broadcasts": ["normal"],
                    "song_categories": ["standard"],
                    "anime_types": ["tv"],
                    "season": {
                        "start": "Winter 2020",
                        "end": "Fall 2024",
                    },
                    "difficulty": {
                        "start": 40,
                        "end": 80,
                        "include_no_difficulty": False,
                    },
                    "media_links": {
                        "require_any": ["audio", "mq"],
                        "require_all": [],
                        "exclude": ["hq"],
                    },
                },
            }
        }
    )

    anime_search_filter: TextSearchFilter | None = None
    song_name_search_filter: TextSearchFilter | None = None
    artist_search_filter: ArtistSearchFilter | None = None
    composer_search_filter: ComposerSearchFilter | None = None
    and_logic: bool = True
    ignore_duplicate: bool = False

    @model_validator(mode="after")
    def require_search_text(self):
        search_filters = (
            self.anime_search_filter,
            self.song_name_search_filter,
            self.artist_search_filter,
            self.composer_search_filter,
        )
        if not any(search_filter and search_filter.search.strip() for search_filter in search_filters):
            raise ValueError("At least one non-empty text search filter is required.")
        return self


class ArtistIdSearchRequest(FilteredRequest):
    artist_ids: list[int] = Field(..., min_length=1, max_length=500)
    group_granularity: int = Field(0, ge=0)
    max_other_artist: int = Field(99, ge=0)
    ignore_duplicate: bool = False


class ComposerIdSearchRequest(FilteredRequest):
    composer_ids: list[int] = Field(..., min_length=1, max_length=500)
    arrangement: bool = True
    group_granularity: int = Field(0, ge=0)
    max_other_artist: int = Field(99, ge=0)
    ignore_duplicate: bool = False


class AnnIdSearchRequest(FilteredRequest):
    annId: int
    ignore_duplicate: bool = False


class AnnIdsSearchRequest(FilteredRequest):
    ann_ids: list[int] = Field(..., min_length=1, max_length=500)
    ignore_duplicate: bool = False


class MalIdsSearchRequest(FilteredRequest):
    mal_ids: list[int] = Field(..., min_length=1, max_length=500)
    ignore_duplicate: bool = False


class AnnSongIdsSearchRequest(FilteredRequest):
    ann_song_ids: list[int] = Field(..., min_length=1, max_length=500)
    ignore_duplicate: bool = False


class AmqSongIdsSearchRequest(FilteredRequest):
    amq_song_ids: list[int] = Field(..., min_length=1, max_length=500)
    ignore_duplicate: bool = False


class SeasonSearchRequest(FilteredRequest):
    season: str = Field(..., max_length=MAX_TEXT_FIELD_LENGTH)
    ignore_duplicate: bool = False


class GetNSongsRequest(FilteredRequest):
    model_config = ConfigDict(json_schema_extra={"example": {"n": 50}})

    n: int = Field(..., ge=1, le=500)


class Artist(BaseModel):
    id: int
    names: list[str]
    line_up_id: int = -1
    groups: list["Artist"] | None = None
    members: list["Artist"] | None = None


Artist.model_rebuild()


class AnimeListLinks(BaseModel):
    myanimelist: int | None = None
    anidb: int | None = None
    anilist: int | None = None
    kitsu: int | None = None


class SongEntry(BaseModel):
    annId: int
    annSongId: int
    amqSongId: int
    animeENName: str
    animeJPName: str
    animeAltName: list[str]
    animeVintage: str | None = None
    linked_ids: AnimeListLinks
    animeType: str | None = None
    animeCategory: str | None = None
    songType: str
    songName: str
    songArtist: str
    songComposer: str
    songArranger: str
    songDifficulty: float | None = None
    songCategory: str | None = None
    songLength: float | None = None
    isDub: bool | None = None
    isRebroadcast: bool | None = None
    HQ: str | None = None
    MQ: str | None = None
    audio: str | None = None
    artists: list[Artist]
    composers: list[Artist]
    arrangers: list[Artist]


class DatabaseTotals(BaseModel):
    total_songs: int
    total_anime: int
    total_artists: int
    total_seasons: int
    links_by_type: dict[str, int]
    songs_by_type: dict[str, int]
    songs_by_broadcast: dict[str, int]
    songs_by_performance: dict[str, int]
    songs_by_anime_type: dict[str, int]


class AnnIdBulkLinkedIds(BaseModel):
    annId: int
    myanimelist: int | None = None
    anidb: int | None = None
    anilist: int | None = None
    kitsu: int | None = None


class AnnIdLinkedAnimeEntry(BaseModel):
    animeENName: str | None = None
    animeJPName: str | None = None
    animeAltName: list[str]
    linked_ids: AnnIdBulkLinkedIds


class RankedTimeStatus(BaseModel):
    active: bool
    region: str | None = Field(None, description="Central, Western, or Eastern when ranked is active.")
    remaining_minutes: int | None = None
    remaining_seconds: int | None = None
    server_time: str = Field(description="Current server time in UTC (ISO 8601).")
