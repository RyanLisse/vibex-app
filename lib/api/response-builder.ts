/**
 * Response Builder Utilities
 *
 * Provides standardized API response creation
 * Ensures consistent response format across all endpoints
 */
<<<<<<< HEAD
import { NextResponse } from "next/server";
import {
	createApiErrorResponse,
	createApiSuccessResponse,
	createPaginatedResponse,
} from "@/src/schemas/api-routes";

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
}

export class ResponseBuilder {
	/**
	 * Create a successful response
	 */
	static success<T>(data: T, message?: string, statusCode = 200): NextResponse {
		return NextResponse.json(createApiSuccessResponse(data, message), {
			status: statusCode,
			headers: ResponseBuilder.getDefaultHeaders(),
		});
	}

	/**
	 * Create a paginated response
	 */
	static paginated<T>(
		data: T[],
		pagination: PaginationInfo,
		message?: string,
	): NextResponse {
		return NextResponse.json(
			createPaginatedResponse(data, pagination, message),
			{
				status: 200,
				headers: ResponseBuilder.getDefaultHeaders(),
			},
		);
	}

	/**
	 * Create an error response
	 */
	static error(
		message: string,
		statusCode = 500,
		code = "INTERNAL_ERROR",
		details?: any,
	): NextResponse {
		return NextResponse.json(
			createApiErrorResponse(message, statusCode, code, details),
			{
				status: statusCode,
				headers: ResponseBuilder.getDefaultHeaders(),
			},
		);
	}

	/**
	 * Create a validation error response
	 */
	static validationError(errors: any[]): NextResponse {
		return ResponseBuilder.error(
			"Validation failed",
			400,
			"VALIDATION_ERROR",
			errors,
		);
	}

	/**
	 * Create a not found response
	 */
	static notFound(resource: string, id?: string): NextResponse {
		const message = id
			? `${resource} with id ${id} not found`
			: `${resource} not found`;

		return ResponseBuilder.error(message, 404, "NOT_FOUND");
	}

	/**
	 * Create an unauthorized response
	 */
	static unauthorized(message = "Unauthorized"): NextResponse {
		return ResponseBuilder.error(message, 401, "UNAUTHORIZED");
	}

	/**
	 * Create a forbidden response
	 */
	static forbidden(message = "Forbidden"): NextResponse {
		return ResponseBuilder.error(message, 403, "FORBIDDEN");
	}

	/**
	 * Create a rate limit response
	 */
	static rateLimitExceeded(retryAfter?: number): NextResponse {
		const headers = ResponseBuilder.getDefaultHeaders();

		if (retryAfter) {
			headers["Retry-After"] = retryAfter.toString();
			headers["X-RateLimit-Reset"] = new Date(
				Date.now() + retryAfter * 1000,
			).toISOString();
		}

		return NextResponse.json(
			createApiErrorResponse(
				"Rate limit exceeded",
				429,
				"RATE_LIMIT_EXCEEDED",
				{ retryAfter },
			),
			{ status: 429, headers },
		);
	}

	/**
	 * Create a conflict response
	 */
	static conflict(message: string, details?: any): NextResponse {
		return ResponseBuilder.error(message, 409, "CONFLICT", details);
	}

	/**
	 * Create a bad request response
	 */
	static badRequest(message: string, details?: any): NextResponse {
		return ResponseBuilder.error(message, 400, "BAD_REQUEST", details);
	}

	/**
	 * Create a created response (201)
	 */
	static created<T>(data: T, message?: string): NextResponse {
		return ResponseBuilder.success(data, message, 201);
	}

	/**
	 * Create a no content response (204)
	 */
	static noContent(): NextResponse {
		return new NextResponse(null, {
			status: 204,
			headers: ResponseBuilder.getDefaultHeaders(),
		});
	}

	/**
	 * Create an accepted response (202)
	 */
	static accepted<T>(data?: T, message?: string): NextResponse {
		return ResponseBuilder.success(data || {}, message, 202);
	}

	/**
	 * Get default headers for all responses
	 */
	private static getDefaultHeaders(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			"Cache-Control": "no-store, no-cache, must-revalidate",
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"X-XSS-Protection": "1; mode=block",
		};
	}

	/**
	 * Add CORS headers if needed
	 */
	static withCORS(
		response: NextResponse,
		origin = "*",
		methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	): NextResponse {
		response.headers.set("Access-Control-Allow-Origin", origin);
		response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
		response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization",
		);
		response.headers.set("Access-Control-Max-Age", "86400");

		return response;
	}
=======
import { NextResponse } from 'next/server'
import {
  createApiSuccessResponse,
  createApiErrorResponse,
  createPaginatedResponse,
} from '@/src/schemas/api-routes'

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export class ResponseBuilder {
  /**
   * Create a successful response
   */
  static success<T>(data: T, message?: string, statusCode = 200): NextResponse {
    return NextResponse.json(createApiSuccessResponse(data, message), {
      status: statusCode,
      headers: this.getDefaultHeaders(),
    })
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(data: T[], pagination: PaginationInfo, message?: string): NextResponse {
    return NextResponse.json(createPaginatedResponse(data, pagination, message), {
      status: 200,
      headers: this.getDefaultHeaders(),
    })
  }

  /**
   * Create an error response
   */
  static error(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: any
  ): NextResponse {
    return NextResponse.json(createApiErrorResponse(message, statusCode, code, details), {
      status: statusCode,
      headers: this.getDefaultHeaders(),
    })
  }

  /**
   * Create a validation error response
   */
  static validationError(errors: any[]): NextResponse {
    return this.error('Validation failed', 400, 'VALIDATION_ERROR', errors)
  }

  /**
   * Create a not found response
   */
  static notFound(resource: string, id?: string): NextResponse {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`

    return this.error(message, 404, 'NOT_FOUND')
  }

  /**
   * Create an unauthorized response
   */
  static unauthorized(message = 'Unauthorized'): NextResponse {
    return this.error(message, 401, 'UNAUTHORIZED')
  }

  /**
   * Create a forbidden response
   */
  static forbidden(message = 'Forbidden'): NextResponse {
    return this.error(message, 403, 'FORBIDDEN')
  }

  /**
   * Create a rate limit response
   */
  static rateLimitExceeded(retryAfter?: number): NextResponse {
    const headers = this.getDefaultHeaders()

    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString()
      headers['X-RateLimit-Reset'] = new Date(Date.now() + retryAfter * 1000).toISOString()
    }

    return NextResponse.json(
      createApiErrorResponse('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter }),
      { status: 429, headers }
    )
  }

  /**
   * Create a conflict response
   */
  static conflict(message: string, details?: any): NextResponse {
    return this.error(message, 409, 'CONFLICT', details)
  }

  /**
   * Create a bad request response
   */
  static badRequest(message: string, details?: any): NextResponse {
    return this.error(message, 400, 'BAD_REQUEST', details)
  }

  /**
   * Create a created response (201)
   */
  static created<T>(data: T, message?: string): NextResponse {
    return this.success(data, message, 201)
  }

  /**
   * Create a no content response (204)
   */
  static noContent(): NextResponse {
    return new NextResponse(null, {
      status: 204,
      headers: this.getDefaultHeaders(),
    })
  }

  /**
   * Create an accepted response (202)
   */
  static accepted<T>(data?: T, message?: string): NextResponse {
    return this.success(data || {}, message, 202)
  }

  /**
   * Get default headers for all responses
   */
  private static getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    }
  }

  /**
   * Add CORS headers if needed
   */
  static withCORS(
    response: NextResponse,
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  ): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }
>>>>>>> ryan-lisse/review-this-pr
}
