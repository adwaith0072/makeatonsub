import { Elysia } from 'elysia';

export const errorPlugin = new Elysia({ name: 'error-plugin' })
  .onError(({ code, error, set }) => {
    // Elysia validation error
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: (error as Error).message || 'Validation failed on request inputs.',
        },
      };
    }

    // Not found
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        error: {
          code: 'NOT_FOUND',
          message: (error as Error).message || 'The requested resource was not found.',
        },
      };
    }

    // Default status handling
    const currentStatus = typeof set.status === 'number' ? set.status : 500;
    const statusCode = currentStatus >= 400 ? currentStatus : 500;
    set.status = statusCode;

    return {
      error: {
        code: statusCode === 403 ? 'FORBIDDEN' : statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR',
        message: (error as Error).message || 'An unexpected error occurred.',
      },
    };
  });
