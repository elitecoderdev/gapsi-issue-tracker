class DomainError(Exception):
    code = "domain_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class InvalidCredentialsError(DomainError):
    code = "invalid_credentials"

    def __init__(self) -> None:
        super().__init__("Usuario o contraseña incorrectos.")


class InvalidTokenError(DomainError):
    code = "invalid_token"

    def __init__(self) -> None:
        super().__init__("La sesión no es válida o ha expirado.")


class TooManyAttemptsError(DomainError):
    code = "too_many_attempts"

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__("Demasiados intentos de inicio de sesión. Intenta nuevamente en unos segundos.")
        self.retry_after_seconds = retry_after_seconds


class IssueNotFoundError(DomainError):
    code = "issue_not_found"

    def __init__(self, issue_id: str) -> None:
        super().__init__(f"La incidencia '{issue_id}' no existe.")


class RepositoryUnavailableError(DomainError):
    code = "repository_unavailable"

    def __init__(self) -> None:
        super().__init__("El servicio de datos no está disponible en este momento.")
