import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { env } from '../config/env';
import { toApiError } from './errors';
import type { ApiEnvelope } from './types';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not attach the access token or attempt a refresh (auth endpoints). */
    skipAuth?: boolean;
    /** Internal: set once a request has been retried after a token refresh. */
    _retried?: boolean;
  }
}

/**
 * Connects the HTTP client to the session without an import cycle.
 * The auth store registers itself at startup (see store/authStore.ts).
 */
export interface AuthBridge {
  getAccessToken(): string | null;
  /** Returns a fresh access token, or null if the session can no longer be refreshed. Single-flight. */
  refreshSession(): Promise<string | null>;
  /** Called when the refresh token is rejected: the user must sign in again. */
  onSessionExpired(): void;
}

let authBridge: AuthBridge | null = null;

export function configureAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge;
}

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.requestTimeoutMs,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Client': `renewly-${Platform.OS}/${env.appVersion}`,
  },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = config.skipAuth ? null : authBridge?.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const status: number | undefined = error.response?.status;

    if (status === 401 && config && !config.skipAuth && !config._retried && authBridge) {
      config._retried = true;
      let token: string | null;
      try {
        token = await authBridge.refreshSession();
      } catch (refreshError) {
        // Offline or server error while refreshing: keep the session, surface the failure.
        throw toApiError(refreshError);
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return http(config);
      }

      authBridge.onSessionExpired();
    }

    throw toApiError(error);
  },
);

export interface ApiResult<T> {
  data: T;
  message: string | null;
}

/** Performs a request and unwraps the `{ success, data, message }` envelope. */
export async function request<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
  try {
    const response = await http.request<ApiEnvelope<T>>(config);
    return { data: response.data.data as T, message: response.data.message };
  } catch (error) {
    throw toApiError(error);
  }
}

export const api = {
  get: <T>(url: string, params?: object, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'GET', url, params }).then(r => r.data),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data: body }).then(r => r.data),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data: body }).then(r => r.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'DELETE', url }).then(r => r.data),
  /** Like post, but also returns the server's user-facing message (e.g. "Password updated."). */
  postWithMessage: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data: body }),
};
