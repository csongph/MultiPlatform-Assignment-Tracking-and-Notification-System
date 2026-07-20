from app.core.exceptions import NotFoundError
from app.integrations.base_adapter import BaseOAuthAdapter
from app.integrations.google_classroom_adapter import GoogleClassroomAdapter
from app.integrations.microsoft_teams_adapter import MicrosoftTeamsAdapter

_ADAPTERS: dict[str, type[BaseOAuthAdapter]] = {
    GoogleClassroomAdapter.platform_name: GoogleClassroomAdapter,
    MicrosoftTeamsAdapter.platform_name: MicrosoftTeamsAdapter,
}

SUPPORTED_PLATFORMS = list(_ADAPTERS.keys())


def get_adapter(platform_name: str) -> BaseOAuthAdapter:
    adapter_class = _ADAPTERS.get(platform_name)
    if adapter_class is None:
        raise NotFoundError(
            f"Unknown platform '{platform_name}'. Supported: {', '.join(SUPPORTED_PLATFORMS)}"
        )
    return adapter_class()


__all__ = ["SUPPORTED_PLATFORMS", "get_adapter"]
