import createError from 'create-error'

export const BaseError = createError('BaseError')

export const ConnectionError = createError(BaseError, 'ConnectionError')

export const NotFoundError = createError(BaseError, 'NotFoundError')

export const ServerError = createError(BaseError, 'ServerError')

export const DownloadError = createError(BaseError, 'DownloadError')
