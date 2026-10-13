// Global Error Handling Middleware
function errorHandler(err, req, res, next) {
    console.error('[Error Handler]', err.stack || err.message);

    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}

module.exports = errorHandler;
