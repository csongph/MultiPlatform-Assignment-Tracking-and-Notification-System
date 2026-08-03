from app.core.exceptions import NotFoundError
from app.integrations.base_adapter import BaseOAuthAdapter
from app.integrations.base_fetcher import BaseAssignmentFetcher
from app.integrations.google_classroom_adapter import GoogleClassroomAdapter, GoogleClassroomFetcher
from app.integrations.microsoft_teams_adapter import MicrosoftTeamsAdapter, MicrosoftTeamsFetcher

_ADAPTERS: dict[str, type[BaseOAuthAdapter]] = {
    GoogleClassroomAdapter.platform_name: GoogleClassroomAdapter,
    MicrosoftTeamsAdapter.platform_name: MicrosoftTeamsAdapter,
}

_FETCHERS: dict[str, type[BaseAssignmentFetcher]] = {
    GoogleClassroomFetcher.platform_name: GoogleClassroomFetcher,
    MicrosoftTeamsFetcher.platform_name: MicrosoftTeamsFetcher,
}

SUPPORTED_PLATFORMS = list(_ADAPTERS.keys())


def get_adapter(platform_name: str) -> BaseOAuthAdapter:
    adapter_class = _ADAPTERS.get(platform_name)
    if adapter_class is None:
        raise NotFoundError(
            f"Unknown platform '{platform_name}'. Supported: {', '.join(SUPPORTED_PLATFORMS)}"
        )
    return adapter_class()


def get_fetcher(platform_name: str) -> BaseAssignmentFetcher:
    fetcher_class = _FETCHERS.get(platform_name)
    if fetcher_class is None:
        raise NotFoundError(f"No assignment fetcher registered for platform '{platform_name}'")
    return fetcher_class()


__all__ = ["SUPPORTED_PLATFORMS", "get_adapter", "get_fetcher"]
