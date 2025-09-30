# 🏢 DemandGen Pro - SaaS Multi-Tenant Architecture

## 🎯 **Admin vs User Separation**

### **👑 ADMIN DASHBOARD** (`admin-dashboard.html`)
**Access Level:** Admin & Super Admin only
**Purpose:** Platform management and oversight

#### **Admin Features:**
- **Platform Statistics**
  - Total users, revenue, campaigns
  - Subscription distribution
  - Growth metrics

- **User Management**
  - View all user accounts
  - Suspend/activate users
  - Manage subscriptions
  - View user activity

- **Billing & Revenue**
  - Monthly recurring revenue (MRR)
  - Payment processing
  - Failed payments tracking
  - Plan distribution

- **System Health**
  - Database status
  - Storage usage
  - Error monitoring
  - Performance metrics

- **Support Management**
  - Support ticket queue
  - Response management
  - Priority handling

### **👤 USER DASHBOARD** (`user-dashboard.html`)
**Access Level:** Individual user accounts
**Purpose:** Personal campaign management

#### **User Features:**
- **Personal Campaign Management**
  - Own campaigns only
  - Performance tracking
  - Asset management

- **Plan Usage Tracking**
  - Campaign limits
  - Storage usage
  - API call limits
  - Billing status

- **Account Management**
  - Profile settings
  - Subscription management
  - Usage analytics

---

## 🔐 **Role-Based Access Control (RBAC)**

### **User Roles:**
```javascript
// Role hierarchy
'super_admin' > 'admin' > 'user'
```

#### **Super Admin**
- Full platform access
- User management
- Admin management
- System configuration
- Audit logs access

#### **Admin**
- User management
- Support tickets
- Platform analytics
- Billing oversight
- Content moderation

#### **User**
- Own campaigns only
- Personal analytics
- Asset library
- Account settings

### **API Route Protection:**
```javascript
// Admin only routes
GET /api/admin/stats
GET /api/admin/users
PATCH /api/admin/users/:id/status

// User routes (own data only)
GET /api/campaigns (filtered by user_id)
POST /api/campaigns
GET /api/analytics (own data)
```

---

## 💾 **Database Architecture**

### **Multi-Tenant Tables:**

#### **Users & Authentication**
```sql
users (id, name, email, role, status, created_at)
user_sessions (user_id, token, expires_at)
```

#### **Subscription Management**
```sql
user_subscriptions (user_id, plan_type, status, expires_at)
billing_transactions (user_id, amount, status, created_at)
plan_limits (plan_type, max_campaigns, max_storage, features)
```

#### **Data Isolation**
```sql
campaigns (user_id, name, status) -- User-specific
assets (user_id, filename, file_path) -- User-specific
analytics (user_id, campaign_id, metrics) -- User-specific
```

#### **Admin & Audit**
```sql
audit_logs (admin_id, action, target_type, details)
support_tickets (user_id, subject, status, admin_response)
error_logs (user_id, error_type, created_at)
```

---

## 📊 **Subscription Plans**

### **Basic Plan - RM 29/month**
- ✅ 10 active campaigns
- ✅ RM 5,000 monthly ad spend
- ✅ 1GB asset storage
- ✅ 10,000 API calls
- ✅ Basic analytics
- ✅ Campaign builder
- ✅ Asset library

### **Pro Plan - RM 89/month**
- ✅ 50 active campaigns
- ✅ RM 15,000 monthly ad spend
- ✅ 5GB asset storage
- ✅ 25,000 API calls
- ✅ Advanced analytics
- ✅ Bulk management
- ✅ Festival planner
- ✅ API access
- ✅ Priority support

### **Enterprise Plan - RM 299/month**
- ✅ 200 active campaigns
- ✅ RM 50,000 monthly ad spend
- ✅ 20GB asset storage
- ✅ 100,000 API calls
- ✅ White-label options
- ✅ Custom integrations
- ✅ Dedicated support
- ✅ Advanced reporting

---

## 🔒 **Security & Data Isolation**

### **Data Separation:**
```javascript
// Every user query includes user_id filter
const userCampaigns = await db.all(
  'SELECT * FROM campaigns WHERE user_id = ?', 
  [req.user.id]
);

// Admin can see all data
const allCampaigns = await db.all(
  'SELECT * FROM campaigns'
); // Only if req.user.role === 'admin'
```

### **Middleware Protection:**
```javascript
// Route protection
app.get('/api/campaigns', userOrAdmin, async (req, res) => {
  // Users see only their data
  // Admins see all data
});

app.get('/api/admin/stats', adminOnly, async (req, res) => {
  // Admin-only endpoint
});
```

---

## 🚀 **SaaS Features Implementation**

### **1. User Registration & Onboarding**
- Email verification
- Plan selection
- Payment processing
- Account activation

### **2. Subscription Management**
- Automatic billing
- Plan upgrades/downgrades
- Usage tracking
- Limit enforcement

### **3. Multi-tenancy**
- Data isolation per user
- Shared infrastructure
- Scalable architecture
- Resource management

### **4. Admin Tools**
- User management
- Analytics dashboard
- Support system
- Billing oversight

### **5. Usage Monitoring**
```javascript
// Track feature usage
await db.run(`
  INSERT INTO feature_usage_logs (user_id, feature_name, metadata)
  VALUES (?, 'campaign_builder', ?)
`, [userId, JSON.stringify({ campaign_type: 'demand_gen' })]);

// Check plan limits
const usage = await checkUserLimits(userId);
if (usage.campaigns >= planLimits.max_campaigns) {
  throw new Error('Campaign limit reached');
}
```

---

## 📈 **Revenue Model**

### **Monthly Recurring Revenue (MRR)**
- Basic: RM 29 × users
- Pro: RM 89 × users  
- Enterprise: RM 299 × users

### **Usage-Based Billing**
- Overage charges for excess usage
- Storage overages: RM 5/GB
- API call overages: RM 0.01/call

### **Add-on Services**
- Custom integrations: RM 500/month
- White-label branding: RM 200/month
- Priority support: RM 100/month

---

## 🛠️ **Deployment Architecture**

### **Production Setup:**
```
Load Balancer
├── Web Server (Nginx)
├── App Server (Node.js + PM2)
├── Database (PostgreSQL)
├── File Storage (AWS S3/Local)
└── Monitoring (Logs + Analytics)
```

### **Scaling Strategy:**
- Horizontal scaling with load balancers
- Database read replicas
- CDN for static assets
- Microservices for heavy features

---

## 📋 **Admin Daily Tasks**

### **Morning Checklist:**
- [ ] Check system health
- [ ] Review new user registrations
- [ ] Process failed payments
- [ ] Review support tickets

### **Weekly Tasks:**
- [ ] Analyze user growth
- [ ] Review platform performance
- [ ] Update feature usage reports
- [ ] Plan capacity scaling

### **Monthly Tasks:**
- [ ] Generate revenue reports
- [ ] Review plan distribution
- [ ] Analyze churn rates
- [ ] Plan feature updates

---

**🇲🇾 DemandGen Pro** - Complete SaaS platform ready for Malaysian market!
