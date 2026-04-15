FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir "pymongo>=4.6.1" "bcrypt==4.1.2"

# Copy init script
COPY init_accounts.py .

CMD ["python", "-u", "init_accounts.py"]
