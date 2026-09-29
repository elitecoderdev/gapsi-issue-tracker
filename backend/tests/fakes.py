from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from google.api_core.exceptions import ServiceUnavailable

Store = dict[str, dict[str, Any]]


@dataclass
class AggregationResult:
    value: int


class FakeSnapshot:
    def __init__(self, document_id: str, data: dict[str, Any] | None) -> None:
        self.id = document_id
        self.exists = data is not None
        self._data = data

    def to_dict(self) -> dict[str, Any] | None:
        return dict(self._data) if self._data is not None else None


class FakeDocument:
    def __init__(self, store: Store, document_id: str) -> None:
        self._store = store
        self.id = document_id

    async def get(self) -> FakeSnapshot:
        return FakeSnapshot(self.id, self._store.get(self.id))

    async def set(self, data: dict[str, Any]) -> None:
        self._store[self.id] = dict(data)

    async def update(self, data: dict[str, Any]) -> None:
        self._store[self.id].update(data)


class FakeAggregation:
    def __init__(self, total: int) -> None:
        self._total = total

    async def get(self) -> list[list[AggregationResult]]:
        return [[AggregationResult(self._total)]]


class FakeQuery:
    def __init__(
        self,
        store: Store,
        filters: tuple[Any, ...] = (),
        order: tuple[str, str] | None = None,
        limit_to: int | None = None,
    ) -> None:
        self._store = store
        self._filters = filters
        self._order = order
        self._limit = limit_to

    def where(self, *, filter: Any) -> "FakeQuery":
        return FakeQuery(self._store, (*self._filters, filter), self._order, self._limit)

    def order_by(self, field: str, direction: str) -> "FakeQuery":
        return FakeQuery(self._store, self._filters, (field, direction), self._limit)

    def limit(self, count: int) -> "FakeQuery":
        return FakeQuery(self._store, self._filters, self._order, count)

    def count(self, alias: str) -> FakeAggregation:
        return FakeAggregation(len(self._matches()))

    async def stream(self) -> AsyncIterator[FakeSnapshot]:
        for document_id, data in self._matches():
            yield FakeSnapshot(document_id, data)

    def _matches(self) -> list[tuple[str, dict[str, Any]]]:
        rows = [
            (document_id, data)
            for document_id, data in self._store.items()
            if all(data.get(item.field_path) == item.value for item in self._filters)
        ]
        if self._order:
            field, direction = self._order
            rows.sort(key=lambda row: row[1][field], reverse=direction == "DESCENDING")
        return rows[: self._limit] if self._limit is not None else rows


class FakeCollection(FakeQuery):
    def document(self, document_id: str | None = None) -> FakeDocument:
        return FakeDocument(self._store, document_id or uuid4().hex)


class FakeFirestoreClient:
    def __init__(self) -> None:
        self.stores: dict[str, Store] = {}

    def collection(self, name: str) -> FakeCollection:
        return FakeCollection(self.stores.setdefault(name, {}))


class FailingDocument:
    id = "failing"

    async def get(self) -> FakeSnapshot:
        raise ServiceUnavailable("firestore down")


class FailingCollection:
    def document(self, document_id: str | None = None) -> FailingDocument:
        return FailingDocument()


class FailingFirestoreClient:
    def collection(self, name: str) -> FailingCollection:
        return FailingCollection()
