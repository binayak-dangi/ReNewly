import axios from 'axios';
import type { ApiEnvelope } from './types';

/** Stable error codes returned by the API (backend ErrorCodes) plus client-side ones. */
export const ErrorCodes = {
  ValidationFailed: 'VALIDATION_FAILED',
  NotFound: 'NOT_FOUND',
  Unauthorized: 'UNAUTHORIZED',
  TokenExpired: 'TOKEN_EXPIRED',
  InvalidToken: 'INVALID_TOKEN',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  AccountLocked: 'ACCOUNT_LOCKED',
  EmailNotVerified: 'EMAIL_NOT_VERIFIED',
  EmailAlreadyRegistered: 'EMAIL_ALREADY_REGISTERED',
  PlanLimitReached: 'PLAN_LIMIT_REACHED',
  ProFeatureRequired: 'PRO_FEATURE_REQUIRED',
  RateLimited: 'RATE_LIMITED',
  InternalError: 'INTERNAL_ERROR',
  // Client-side
  Network: 'NETWORK_ERROR',
  Timeout: 'TIMEOUT',
  Unknown: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes] | (string & {});

/** Every failed request surfaces as an ApiError, whatever went wrong underneath. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number | null;
  /** Field errors keyed by camelCase property name, e.g. { price: ["Price cannot be negative."] }. */
  readonly details: Record<string, string[]>;
  readonly traceId: string | null;

  constructor(options: {
    code: ErrorCode;
    message: string;
    status?: number | null;
    details?: Record<string, string[]> | null;
    traceId?: string | null;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status ?? null;
    this.details = options.details ?? {};
    this.traceId = options.traceId ?? null;
  }

  get isNetworkError(): boolean {
    return this.code === ErrorCodes.Network || this.code === ErrorCodes.Timeout;
  }

  /** 4xx errors are deterministic – retrying will not help. */
  get isClientError(): boolean {
    return this.status !== null && this.status >= 400 && this.status < 500;
  }

  /** First message for a field, for inline form errors. */
  fieldError(field: string): string | undefined {
    return this.details[field]?.[0];
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  [ErrorCodes.Network]: "You're offline or the server can't be reached. Check your connection and try again.",
  [ErrorCodes.Timeout]: 'The request took too long. Please try again.',
  [ErrorCodes.InternalError]: 'Something went wrong on our side. Please try again later.',
  [ErrorCodes.Unknown]: 'Something went wrong. Please try again.',
};

/** Converts anything thrown by axios (or elsewhere) into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as Partial<ApiEnvelope<unknown>> | undefined;
    const body = envelope?.error;

    if (error.response && body?.code) {
      return new ApiError({
        code: body.code,
        message: body.message || FRIENDLY_MESSAGES[ErrorCodes.Unknown],
        status: error.response.status,
        details: body.details,
        traceId: envelope?.traceId,
      });
    }

    if (error.response) {
      const status = error.response.status;
      const code = status >= 500 ? ErrorCodes.InternalError : ErrorCodes.Unknown;
      return new ApiError({ code, message: FRIENDLY_MESSAGES[code], status });
    }

    const code = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? ErrorCodes.Timeout : ErrorCodes.Network;
    return new ApiError({ code, message: FRIENDLY_MESSAGES[code] });
  }

  return new ApiError({
    code: ErrorCodes.Unknown,
    message: error instanceof Error && __DEV__ ? error.message : FRIENDLY_MESSAGES[ErrorCodes.Unknown],
  });
}

/** Message suitable for showing to the user. */
export function errorMessage(error: unknown): string {
  return toApiError(error).message;
}
