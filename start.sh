#!/bin/bash
cd backend
pip install --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
