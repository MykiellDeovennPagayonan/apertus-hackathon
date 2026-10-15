from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["choice", "score", "noul"]
    instructions: str = Field(min_length=1, max_length=2000)
    criteria: dict[str, str] | list[str] | None = None

    @field_validator("instructions")
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError("Instructions cannot be blank")
        return value

class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    state: str | dict[str, Any] | list[Any]
    questions: dict[str, Question] = Field(min_length=1, max_length=8)

    @field_validator("questions")
    @classmethod
    def validate_questions(cls, questions):
        for question in questions.values():
            if question.type in {"choice", "score"} and not (question.criteria and 2 <= len(question.criteria) <= 64):
                raise ValueError("Choice/score questions require 2–64 criteria")
        return questions

class RuntimeStatus(BaseModel):
    state: Literal["loading", "ready", "error"]
    model: str
    auth_required: bool
    device: str
    dtype: str
    load_ms: float | None = None
    warmup_ms: float | None = None
