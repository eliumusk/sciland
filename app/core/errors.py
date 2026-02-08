class AppError(Exception):
    def __init__(self, message: str, status_code: int = 500, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class BadRequestError(AppError):
    def __init__(self, message: str, details=None):
        super().__init__(message, 400, details)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401)


class NotFoundError(AppError):
    def __init__(self, message: str = "Not found"):
        super().__init__(message, 404)


class GithubApiError(AppError):
    def __init__(self, message: str, status_code: int, details=None):
        super().__init__(message, status_code, details)
