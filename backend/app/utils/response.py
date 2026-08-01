from typing import Any, Optional

def success_response(data: Any = None, message: str = "success") -> dict:
    return {
        "code": 200,
        "message": message,
        "data": data
    }

def error_response(message: str = "error", code: int = 400) -> dict:
    return {
        "code": code,
        "message": message,
        "data": None
    }

def paginated_response(items: list, total: int, page: int, page_size: int) -> dict:
    return {
        "code": 200,
        "message": "success",
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }
