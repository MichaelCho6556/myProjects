#!/usr/bin/env python3
import requests
import os

try:
    response = requests.get('http://localhost:5000/', timeout=5)
    if response.status_code == 200:
        sys.exit(0)
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)