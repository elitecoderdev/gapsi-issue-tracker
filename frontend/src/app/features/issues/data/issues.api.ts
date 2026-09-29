import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@core/config/api-base-url';
import { Observable, map } from 'rxjs';
import {
  CreateIssuePayload,
  Issue,
  IssueChanges,
  IssueDto,
  IssueFilters,
  IssueSummary,
  IssueSummaryDto,
} from './issue.models';

function toIssue(dto: IssueDto): Issue {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    priority: dto.priority,
    createdBy: dto.created_by,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

function toFilterParams(filters: IssueFilters): HttpParams {
  return Object.entries(filters).reduce(
    (params, [key, value]) => (value ? params.set(key, value) : params),
    new HttpParams(),
  );
}

@Injectable({ providedIn: 'root' })
export class IssuesApi {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/issues`;

  list(filters: IssueFilters): Observable<Issue[]> {
    return this.http
      .get<IssueDto[]>(this.endpoint, { params: toFilterParams(filters) })
      .pipe(map((issues) => issues.map(toIssue)));
  }

  summary(): Observable<IssueSummary> {
    return this.http
      .get<IssueSummaryDto>(`${this.endpoint}/summary`)
      .pipe(map((summary) => ({ total: summary.total, byStatus: summary.by_status })));
  }

  create(payload: CreateIssuePayload): Observable<Issue> {
    return this.http.post<IssueDto>(this.endpoint, payload).pipe(map(toIssue));
  }

  update(issueId: string, changes: IssueChanges): Observable<Issue> {
    return this.http.patch<IssueDto>(`${this.endpoint}/${encodeURIComponent(issueId)}`, changes).pipe(map(toIssue));
  }
}
