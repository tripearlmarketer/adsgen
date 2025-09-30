# 🚀 DemandGen Pro - Deployment Guide

## Quick Deployment Options

### 1. 📦 Download & Extract
```bash
# Extract the package
tar -xzf demandgen-pro-saas.tar.gz
cd demandgen-pro
```

### 2. ⚡ Quick Start (Local Development)
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Initialize database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```
**Access at:** http://localhost:3000

### 3. 🐳 Docker Deployment (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t demandgen-pro .
docker run -d -p 3000:3000 --name demandgen-pro-app demandgen-pro
```

### 4. 🌐 VPS/Server Deployment
```bash
# 1. Upload to server
scp demandgen-pro-saas.tar.gz user@your-server.com:/var/www/

# 2. Extract and setup
ssh user@your-server.com
cd /var/www/
tar -xzf demandgen-pro-saas.tar.gz
cd demandgen-pro

# 3. Install dependencies
npm install --production

# 4. Setup environment
cp .env.example .env
nano .env  # Edit configuration

# 5. Initialize database
npm run db:migrate
npm run db:seed

# 6. Install PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 7. Setup Nginx (optional)
sudo nano /etc/nginx/sites-available/demandgen-pro
```

### 5. ☁️ Cloud Platform Deployment

#### **Heroku**
```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git push heroku main
```

#### **Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### **DigitalOcean App Platform**
1. Connect your GitHub repository
2. Select Node.js environment
3. Set environment variables
4. Deploy automatically

## 🔧 Configuration

### Environment Variables (.env)
```env
# Required
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-this

# Database
DATABASE_URL=./database/demandgen.sqlite

# Optional - Google Ads Integration
GOOGLE_ADS_CLIENT_ID=your-client-id
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Database Setup

### SQLite (Default - Development)
```bash
# Already configured - no additional setup needed
npm run db:migrate
npm run db:seed
```

### PostgreSQL (Production Recommended)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb demandgen_pro

# Update .env
DATABASE_URL=postgresql://username:password@localhost:5432/demandgen_pro

# Run migrations
npm run db:migrate
```

## 🔒 Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL certificate
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable rate limiting
- [ ] Update dependencies regularly

## 📈 Performance Optimization

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'demandgen-pro',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G'
  }]
};
```

### Nginx Caching
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔍 Monitoring & Logs

### View Logs
```bash
# PM2 logs
pm2 logs demandgen-pro

# Docker logs
docker logs demandgen-pro-app

# Application logs
tail -f logs/app.log
```

### Health Check
```bash
# Check if application is running
curl http://localhost:3000/api/health

# Expected response: {"status":"ok","timestamp":"..."}
```

## 🛠️ Troubleshooting

### Common Issues

**Port already in use**
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Database connection error**
```bash
# Check database file permissions
ls -la database/
# Fix permissions
chmod 644 database/demandgen.sqlite
```

**Memory issues**
```bash
# Increase Node.js memory limit
node --max_old_space_size=2048 src/server.js
```

## 📞 Support

### Getting Help
- Check logs in `/logs` directory
- Review API documentation at `/api/docs`
- Verify environment variables in `.env`
- Test database connection

### File Structure
```
demandgen-pro/
├── src/                 # Application source code
├── public/              # Static frontend files
├── database/            # Database files
├── logs/               # Application logs
├── uploads/            # User uploaded files
├── .env                # Environment configuration
├── package.json        # Dependencies
└── README.md           # Documentation
```

---

**🇲🇾 DemandGen Pro** - Ready to deploy and scale your Google Ads demand generation platform!
