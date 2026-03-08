"""
Standard API Response Format
"""
from typing import Any, Optional, Dict
from pydantic import BaseModel


class ApiResponse(BaseModel):
    """Standard API response"""
    code: int = 200
    message: str = "Success"
    data: Optional[Any] = None


def api_response(
    data: Any = None,
    message: str = "Success",
    code: int = 200,
) -> Dict:
    """
    Create a standard API response

    Args:
        data: Response data
        message: Response message
        code: Response code

    Returns:
        Dict with standardized response format
    """
    return {
        "code": code,
        "message": message,
        "data": data,
    }


def error_response(message: str, code: int = 400) -> Dict:
    """
    Create an error response

    Args:
        message: Error message
        code: Error code

    Returns:
        Dict with error response format
    """
    return {
        "code": code,
        "message": message,
        "data": None,
    }


def success_response(data: Any = None, message: str = "Success") -> Dict:
    """
    Create a success response

    Args:
        data: Response data
        message: Success message

    Returns:
        Dict with success response format
    """
    return api_response(data=data, message=message, code=200)
