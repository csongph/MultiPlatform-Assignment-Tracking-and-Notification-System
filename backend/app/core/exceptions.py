class AppError(Exception):
    """Base class for expected, handled application errors."""

    status_code: int = 400

    def __init__(self, message: str, status_code: int | None = None):
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404


class UnauthorizedError(AppError):
    status_code = 401


class ConflictError(AppError):
    status_code = 409


class OAuthProviderError(AppError):
    """Raised when Google/Microsoft returns an error during the OAuth exchange."""

    status_code = 502
