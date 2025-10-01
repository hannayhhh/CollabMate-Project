#!/bin/sh
echo "✅ Frontend running at http://localhost"
exec nginx -g "daemon off;"
