"""Schema conversion utilities for consistent uid/id mapping."""

from typing import List, TypeVar, Type
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)


def models_to_response(models: List, schema: Type[T]) -> List[dict]:
    """
    Convert database models to Pydantic schemas with proper uid -> id mapping.

    Args:
        models: List of database model instances (e.g., Admin, Employee)
        schema: Pydantic schema class (e.g., AdminPublic, EmployeeFull)

    Returns:
        List of dictionaries with 'id' field (converted from 'uid')

    Example:
        admins = await Admin.find_all().to_list()
        return models_to_response(admins, AdminPublic)
    """
    return [
        schema.model_validate(model).model_dump(by_alias=True, mode='json')
        for model in models
    ]
