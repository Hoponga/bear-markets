#!/bin/bash

# UC Berkeley Prediction Markets - Production Deployment Script

echo "🚀 Deploying Berkeley Markets..."

# Update system
sudo apt-get update
sudo apt-get install -y python3.9 python3-pip nginx mongodb npm

# Install backend dependencies
cd backend
python3 -m pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
npm run build

# Setup systemd service for backend
sudo tee /etc/systemd/system/markets-backend.service > /dev/null <<EOF
[Unit]
Description=Berkeley Markets Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment="PATH=/usr/bin"
ExecStart=/usr/bin/uvicorn app.main:socket_app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Setup systemd service for frontend
sudo tee /etc/systemd/system/markets-frontend.service > /dev/null <<EOF
[Unit]
Description=Berkeley Markets Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/frontend
Environment="PATH=/usr/bin"
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx as reverse proxy
sudo tee /etc/nginx/sites-available/markets > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/markets /etc/nginx/sites-enabled/

# Start services
sudo systemctl daemon-reload
sudo systemctl enable markets-backend
sudo systemctl enable markets-frontend
sudo systemctl start markets-backend
sudo systemctl start markets-frontend
sudo systemctl restart nginx

echo "✅ Deployment complete!"
echo "Backend: http://your-server:8000"
echo "Frontend: http://your-server"
