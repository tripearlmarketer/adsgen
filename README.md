# DemandGen Pro - Google Ads Demand Generation SaaS Platform

🚀 **Complete Google Ads Demand Generation platform tailored for the Malaysian market**

## 🌟 Features

### ✅ **Core Platform Features**
- **Campaign Builder** - 5-step wizard with proper Google Ads targeting
- **Bulk Campaign Management** - Multi-select, bulk actions, progress tracking
- **Analytics Dashboard** - Real-time performance metrics and insights
- **Creative Asset Library** - Upload, manage, and optimize creative assets
- **Malaysia Festive Planner** - Festival-specific campaign recommendations
- **AI Optimization** - Smart recommendations and automated optimizations

### 🎯 **Advanced Targeting (Based on Google Ads)**
- **Demographics** - Age, gender, parental status, household income
- **Geographic** - Malaysia-focused with city/state targeting
- **Affinity Audiences** - 50+ categories (Health & Fitness, Tobacco, etc.)
- **In-Market Audiences** - Ready-to-buy audiences (Smoking Cessation, Health Supplements)
- **Life Events** - Major life changes (New job, Recently moved, etc.)
- **Custom Audiences** - Website visitors, customer lists, lookalike audiences
- **Device & Scheduling** - Complete device and time-based targeting

### 🇲🇾 **Malaysia-Specific Features**
- **Multi-language support** - Bahasa Malaysia, English, Chinese, Tamil
- **Festival targeting** - Deepavali, Chinese New Year, Hari Raya, etc.
- **Local audience segments** - Perokok & Vape, Kesihatan & Wellness, Pekerja Luar
- **Malaysia market insights** - Local performance benchmarks and recommendations

## 🏗️ **Architecture**

### **Backend (Node.js + TypeScript + Fastify)**
- RESTful API with JWT authentication
- SQLite database with 15+ tables
- Rate limiting and security middleware
- Comprehensive error handling
- Database migrations and seeding

### **Frontend (Next.js + Tailwind CSS)**
- Responsive design with Malaysia-themed UI
- Interactive campaign builder
- Real-time data visualization
- Asset management interface
- Mobile-optimized experience

## 📦 **Installation Guide**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Git

### **Quick Start**

1. **Extract the package**
```bash
tar -xzf demandgen-pro-saas.tar.gz
cd demandgen-pro
```

2. **Install dependencies**
```bash
# Backend
npm install

# Frontend (if separate)
cd frontend && npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Database setup**
```bash
npm run db:migrate
npm run db:seed
```

5. **Start the application**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### **Environment Variables**
```env
# Server Configuration
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here

# Database
DATABASE_URL=./database.sqlite

# API Keys (Optional - for real Google Ads integration)
GOOGLE_ADS_CLIENT_ID=your-google-ads-client-id
GOOGLE_ADS_CLIENT_SECRET=your-google-ads-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🚀 **Deployment Options**

### **Option 1: VPS/Dedicated Server**
```bash
# 1. Upload files to server
scp demandgen-pro-saas.tar.gz user@your-server.com:/var/www/

# 2. Extract and setup
ssh user@your-server.com
cd /var/www/
tar -xzf demandgen-pro-saas.tar.gz
cd demandgen-pro

# 3. Install and configure
npm install --production
cp .env.example .env
# Edit .env file

# 4. Setup PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 5. Setup Nginx reverse proxy
sudo nano /etc/nginx/sites-available/demandgen-pro
# Add Nginx configuration
sudo ln -s /etc/nginx/sites-available/demandgen-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Option 2: Docker Deployment**
```bash
# Build and run with Docker
docker build -t demandgen-pro .
docker run -d -p 3000:3000 --name demandgen-pro-app demandgen-pro
```

### **Option 3: Cloud Platforms**
- **Heroku**: Ready with Procfile
- **Vercel**: Frontend deployment ready
- **DigitalOcean App Platform**: One-click deployment
- **AWS EC2**: Full server deployment
- **Google Cloud Run**: Containerized deployment

## 📊 **Database Schema**

### **Core Tables**
- `users` - User accounts and authentication
- `accounts` - Google Ads accounts
- `campaigns` - Campaign data and settings
- `ad_groups` - Ad group organization
- `ads` - Individual ads and creatives
- `assets` - Creative asset library
- `audience_packs` - Predefined audience segments
- `rules` - Automated rules and optimizations
- `experiments` - A/B testing data
- `reports` - Performance analytics
- `alerts` - Notification system
- `audit_logs` - System activity tracking

## 🔧 **API Endpoints**

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh

### **Campaigns**
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### **Assets**
- `GET /api/assets` - List assets
- `POST /api/assets/upload` - Upload asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### **Analytics**
- `GET /api/reports/performance` - Performance data
- `GET /api/reports/insights` - AI insights
- `GET /api/reports/export` - Export reports

## 🎨 **Customization**

### **Branding**
- Update logo in `/public/logo.png`
- Modify colors in `tailwind.config.js`
- Edit company info in `/src/config/app.js`

### **Features**
- Add new audience segments in `/src/data/audiences.js`
- Customize Malaysia festivals in `/src/data/festivals.js`
- Extend API endpoints in `/src/routes/`

## 🔒 **Security Features**
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 📈 **Performance Optimization**
- Database indexing
- API response caching
- Image optimization
- Code splitting
- Lazy loading
- CDN-ready assets

## 🛠️ **Development**

### **Project Structure**
```
demandgen-pro/
├── src/
│   ├── routes/          # API routes
│   ├── models/          # Database models
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   └── utils/           # Helper functions
├── public/              # Static assets
├── database/            # Database files
├── migrations/          # Database migrations
├── seeds/              # Database seeds
├── tests/              # Test files
└── docs/               # Documentation
```

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run test        # Run tests
npm run db:migrate  # Run database migrations
npm run db:seed     # Seed database
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

## 📞 **Support & Documentation**

### **Getting Help**
- Check the `/docs` folder for detailed documentation
- Review API documentation at `/api/docs` when server is running
- Check logs in `/logs` directory for troubleshooting

### **Common Issues**
1. **Port already in use**: Change PORT in .env file
2. **Database connection**: Check DATABASE_URL path
3. **Permission errors**: Ensure proper file permissions
4. **Missing dependencies**: Run `npm install` again

## 🚀 **Production Checklist**

- [ ] Update all environment variables
- [ ] Set strong JWT_SECRET
- [ ] Configure proper database (PostgreSQL recommended for production)
- [ ] Setup SSL certificate
- [ ] Configure backup strategy
- [ ] Setup monitoring and logging
- [ ] Configure email notifications
- [ ] Test all features thoroughly
- [ ] Setup domain and DNS
- [ ] Configure firewall rules

## 📄 **License**
This is a commercial SaaS platform. All rights reserved.

## 🔄 **Updates & Maintenance**
- Regular security updates
- Feature enhancements based on Google Ads API changes
- Malaysia market-specific optimizations
- Performance monitoring and optimization

---

**DemandGen Pro** - Empowering Malaysian businesses with advanced Google Ads demand generation capabilities! 🇲🇾🚀
