from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class RemoteCourse:
    """A course/class as reported by the remote platform."""

    external_id: str
    name: str


@dataclass
class RemoteAssignment:
    """One piece of coursework as reported by the remote platform,
    already normalized to the shape our `Assignment` model expects."""

    external_id: str
    title: str
    description: str | None
    due_at: datetime | None
    source_status: str  # raw state string from the provider, e.g. "PUBLISHED"
    computed_status: str  # normalized: not_submitted / submitted / overdue
    source_url: str


@dataclass
class RemoteCourseWithAssignments:
    course: RemoteCourse
    assignments: list[RemoteAssignment] = field(default_factory=list)


class TokenExpiredError(Exception):
    """Raised by a fetcher when the provider rejected the access token
    (401) so the sync engine can refresh it and retry exactly once."""


class BaseAssignmentFetcher(ABC):
    """
    Every platform integration that supports pulling assignment data
    implements this interface. The sync engine only ever talks to this
    interface, never to a specific provider's API shape — adding a new
    platform later means adding one new fetcher class and registering it
    in app/integrations/__init__.py, nothing else.
    """

    #: must match a row in the `platforms` table (Platform.name)
    platform_name: str

    @abstractmethod
    async def fetch_assignments(self, access_token: str) -> list[RemoteCourseWithAssignments]:
        """Return every active course + its (non-deleted) coursework for
        the user identified by `access_token`.

        Raises:
            TokenExpiredError: if the provider rejected the token (401).
            NotImplementedError: if this platform doesn't support
                assignment sync yet (OAuth-only integration).
        """
        raise NotImplementedError
