# 🎌 AniManga Recommender

A comprehensive full-stack anime and manga recommendation platform with advanced social features, content moderation, privacy controls, and intelligent ML-powered recommendations. Built with React TypeScript frontend and Python Flask backend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.1.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.1.1-green.svg)
![Python](https://img.shields.io/badge/Python-3.10+-green.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)

## 📸 Screenshots

### Homepage with Advanced Filtering
![Homepage Screenshot](docs/images/homepage.png)
*Advanced search and filtering interface with multi-select dropdowns*

### User Dashboard
![Dashboard Screenshot](docs/images/dashboard.png)
*Personalized dashboard with statistics, recommendations, and activity feed*

### Custom Lists Management
![Lists Screenshot](docs/images/lists.png)
*Advanced list management with collaboration, analytics, and sharing features*

### Analytics Dashboard
![Analytics Screenshot](docs/images/analytics.png)
*Comprehensive analytics with multiple chart types and time-based filtering*

## 🚀 Live Demo

🔗 **[Live Application](https://your-deployment-url.com)** *(Coming Soon)*

## ✨ Complete Feature Overview

### 🎯 Core Anime/Manga Platform
- **Massive Database**: 25,000+ anime/manga with comprehensive metadata
- **Intelligent Recommendations**: ML-powered content-based filtering using TF-IDF and cosine similarity
- **Advanced Search**: Multi-parameter filtering with real-time results
- **Detailed Item Pages**: Complete information including trailers, related content, and personalized recommendations

### 🔐 User Management & Authentication
- **Secure Authentication**: JWT-based system with Supabase integration
- **Rich User Profiles**: Customizable profiles with avatars, bio, and statistics
- **Privacy Controls**: Granular visibility settings for profile, lists, and activity
- **User Statistics**: Comprehensive tracking of viewing habits and preferences

### 📋 Advanced List Management
- **Personal Lists**: Traditional watch/read status tracking (watching, completed, plan to watch, etc.)
- **Custom Lists**: Create unlimited themed lists with descriptions and tags
- **Collaborative Lists**: Share and collaborate on lists with other users
- **List Analytics**: Detailed statistics and visualizations for each list
- **Batch Operations**: Efficiently manage multiple items simultaneously
- **Drag & Drop**: Intuitive reordering and organization

### 👥 Social Features & Community
- **User Following**: Follow users and discover new content through their activity
- **Comments System**: Comment on lists, items, and reviews with nested threads
- **Reviews Platform**: Comprehensive review system with multiple rating aspects
- **Activity Feeds**: Real-time updates on friend activities and interactions
- **User Discovery**: Find users with similar interests and preferences

### 🛡️ Privacy & Security
- **Granular Privacy Settings**: Control visibility of profile, lists, activity, and statistics
- **Privacy Enforcement Middleware**: Automatic data filtering based on user preferences
- **Content Moderation**: AI-powered toxicity detection and keyword filtering
- **Security Features**: Rate limiting, input validation, and secure token handling

### 📊 Analytics & Insights
- **Personal Analytics**: Completion rates, rating distributions, and genre preferences
- **List Analytics**: Timeline charts, status breakdowns, and comparative analysis
- **Statistics Dashboard**: Comprehensive viewing/reading statistics with trends
- **Export Functionality**: Download data in multiple formats

### 🔧 Content Moderation & Community Management
- **Automated Moderation**: AI-powered content analysis for inappropriate content
- **Reporting System**: Anonymous reporting with multiple categories
- **Moderation Dashboard**: Staff tools for managing reports and user actions
- **Appeals Process**: Users can appeal moderation decisions
- **Reputation System**: Community-driven user reputation scoring

### 📱 User Experience & Performance
- **Responsive Design**: Optimized for all device sizes
- **Virtual Scrolling**: Efficient handling of large datasets
- **Real-time Updates**: Live notifications and activity feeds
- **Offline Support**: Basic functionality when network is unavailable
- **Accessibility**: Full screen reader support and keyboard navigation

### 🔄 Background Processing
- **Celery Task Queue**: Asynchronous processing for recommendations and data updates
- **Redis Caching**: Performance optimization for frequently accessed data
- **Scheduled Tasks**: Automated maintenance and data synchronization
- **Batch Operations**: Efficient processing of bulk actions

## 🏗 Technical Architecture

### Frontend Stack
- **React 19.1.0** - Modern UI framework with concurrent features
- **TypeScript 5.8.3** - Full type safety and enhanced developer experience
- **React Router DOM 7.6.0** - Client-side routing and navigation
- **Recharts 2.8.0** - Advanced data visualization and analytics
- **React Select 5.10.1** - Multi-select components with search
- **React DnD** - Drag and drop functionality for lists
- **Axios 1.9.0** - HTTP client with interceptors and authentication

### Backend Stack
- **Python 3.10+** - Modern Python with type hints
- **Flask 3.1.1** - Lightweight web framework with blueprints
- **Supabase** - PostgreSQL database with real-time capabilities
- **Celery 5.4.0** - Distributed task queue for background processing
- **Redis 5.2.0** - Caching and message broker
- **Scikit-learn 1.6.1** - Machine learning for recommendations
- **PyJWT 2.10.1** - JSON Web Token handling

### Database & Infrastructure
- **PostgreSQL** (via Supabase) - Relational database with advanced features
- **Redis** - Caching layer and Celery broker
- **Docker** - Containerization for development and deployment
- **Nginx** - Reverse proxy and static file serving

### Key Integrations
- **MyAnimeList API** - Anime and manga metadata
- **Supabase Auth** - User authentication and management
- **Content Analysis API** - Automated content moderation
- **Email Services** - Notifications and account management

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+** and **npm**
- **Python 3.10+** and **pip**
- **Redis Server** (for background tasks)
- **Docker** (optional, for containerized deployment)

### Option 1: Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/MichaelCho6556/myProjects.git
cd "AniManga Recommender"
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py

# In separate terminals, run background services:
python scripts/start_worker.py      # Celery worker
python scripts/start_scheduler.py   # Task scheduler
```

Backend will be available at `http://localhost:5000`

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will be available at `http://localhost:3000`

### Option 2: Docker Setup
```bash
# Clone the repository
git clone https://github.com/MichaelCho6556/myProjects.git
cd "AniManga Recommender"

# Start all services with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Redis: localhost:6379
```

## 🔧 Environment Configuration

### Backend Environment Variables (.env in /backend)
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# JWT Configuration
JWT_SECRET_KEY=your_super_secret_jwt_key_for_token_signing

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your_flask_secret_key_for_sessions

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Content Moderation (optional)
CONTENT_ANALYSIS_API_KEY=your_content_analysis_api_key
```

### Frontend Environment Variables (.env in /frontend)
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_SOCIAL_FEATURES=true
REACT_APP_ENABLE_MODERATION=true
```

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with the following key tables:

### Core Content Tables
- `items` - Anime/manga with metadata
- `genres`, `themes`, `demographics` - Classification data
- `studios`, `authors` - Creator information

### User Management
- `user_profiles` - Extended user information
- `user_privacy_settings` - Privacy controls
- `user_statistics` - Usage statistics
- `user_reputation` - Community reputation scores

### Social Features
- `custom_lists` - User-created lists
- `comments` - Comments on various content
- `reviews` - User reviews with ratings
- `user_follows` - Following relationships

### Moderation System
- `comment_reports`, `review_reports` - Content reporting
- `moderation_actions` - Staff actions
- `appeals` - User appeals process
- `user_roles` - Staff and moderator roles

## 🚀 API Documentation

### Base Information
- **Base URL**: `http://localhost:5000` (development)
- **Authentication**: JWT Bearer Token
- **Content-Type**: `application/json`
- **Rate Limiting**: 10 requests/minute per authenticated user

### Public Endpoints

#### GET `/` - Health Check
```json
{
  "message": "Hello from AniManga Recommender Backend! Loaded 68598 items.",
  "status": "healthy",
  "version": "2.0.0"
}
```

#### GET `/api/items` - Get Items with Filtering
```bash
GET /api/items?page=1&per_page=20&q=attack&genre=action&min_score=8.0&media_type=anime
```

**Response:**
```json
{
  "items": [
    {
      "uid": "anime_16498",
      "title": "Attack on Titan",
      "media_type": "anime",
      "score": 9.0,
      "genres": ["Action", "Drama"],
      "main_picture": "https://example.com/image.jpg",
      "episodes": 25,
      "synopsis": "Humanity fights for survival...",
      "status": "Finished Airing"
    }
  ],
  "total_items": 1205,
  "total_pages": 61,
  "current_page": 1
}
```

#### GET `/api/items/<uid>` - Get Item Details
Returns comprehensive item information including recommendations.

#### GET `/api/recommendations/<uid>` - Get Recommendations
```bash
GET /api/recommendations/anime_16498?n=10&min_score=7.0
```

### Protected Endpoints (Require Authentication)

#### GET `/api/auth/dashboard` - User Dashboard
```json
{
  "user_stats": {
    "total_anime_watched": 142,
    "total_manga_read": 58,
    "average_score": 7.8,
    "completion_rate": 0.85
  },
  "recent_activity": [...],
  "recommendations": [...],
  "in_progress": [...]
}
```

#### GET `/api/auth/lists` - User's Custom Lists
#### POST `/api/auth/lists` - Create New List
#### GET `/api/auth/privacy-settings` - Privacy Configuration
#### POST `/api/auth/privacy-settings` - Update Privacy Settings

### Social Endpoints
#### GET `/api/social/users/<user_id>/profile` - Public Profile
#### POST `/api/social/follow/<user_id>` - Follow User
#### GET `/api/social/comments/<parent_type>/<parent_id>` - Get Comments
#### POST `/api/social/comments` - Create Comment
#### GET `/api/social/reviews/<item_uid>` - Get Reviews
#### POST `/api/social/reviews` - Create Review

### Analytics Endpoints
#### GET `/api/analytics/lists/<list_id>` - List Analytics
#### GET `/api/analytics/user-stats` - User Statistics
#### GET `/api/analytics/export/<format>` - Export Data

### Moderation Endpoints
#### GET `/api/moderation/reports` - View Reports (Staff Only)
#### POST `/api/moderation/reports` - Submit Report
#### POST `/api/moderation/actions` - Take Moderation Action (Staff Only)

## 🧪 Testing

### Frontend Testing
```bash
cd frontend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm test -- --testNamePattern="integration"
npm test -- --testNamePattern="accessibility"
npm test -- --testNamePattern="performance"
```

### Backend Testing
```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific categories
pytest -m unit          # Unit tests
pytest -m integration   # Integration tests
pytest -m performance   # Performance tests
pytest -m security      # Security tests
```

### Test Categories
- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API and database integration
- **E2E Tests**: Complete user workflow testing
- **Accessibility Tests**: WCAG compliance verification
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authentication and authorization

## 🚀 Deployment

### Production Environment Setup

#### Docker Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Scale services as needed
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

#### Environment Configuration for Production
```bash
# Backend Production
FLASK_ENV=production
SUPABASE_URL=https://your-prod-project.supabase.co
JWT_SECRET_KEY=your_ultra_secure_production_key
REDIS_URL=redis://your-redis-server:6379/0

# Frontend Production
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_SUPABASE_URL=https://your-prod-project.supabase.co
```

### Deployment Platforms

#### Vercel (Frontend)
```bash
# Set environment variables in Vercel dashboard
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_production_anon_key
```

#### Railway/Heroku (Backend)
```bash
# Set configuration via CLI
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set JWT_SECRET_KEY=your_secure_key
heroku config:set REDIS_URL=redis://your-redis-addon
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Backend Issues
```bash
# Database connection test
python -c "from supabase_client import SupabaseClient; print('✅ Connected')"

# Redis connection test
redis-cli ping

# Check Celery worker status
celery -A celery_app inspect active
```

#### Frontend Issues
```bash
# Clear React cache
rm -rf node_modules/.cache
npm start

# Check API connectivity
curl http://localhost:5000/api/items?page=1&per_page=1
```

#### Performance Issues
- **High Memory Usage**: Reduce `per_page` parameters, enable virtual scrolling
- **Slow Recommendations**: Check Celery worker status, verify Redis connection
- **Database Queries**: Monitor Supabase dashboard for slow queries

## 📁 Project Structure

```
AniManga Recommender/
├── backend/
│   ├── middleware/              # Authentication & privacy middleware
│   ├── tasks/                   # Celery background tasks
│   ├── scripts/                 # Data processing and management
│   ├── tests/                   # Comprehensive test suite
│   ├── utils/                   # Utility functions
│   ├── app.py                   # Main Flask application
│   ├── models.py                # Database models & ML algorithms
│   ├── supabase_client.py       # Database client wrapper
│   ├── celery_app.py           # Celery configuration
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── analytics/       # Chart and analytics components
│   │   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── lists/           # List management components
│   │   │   ├── social/          # Social feature components
│   │   │   └── common/          # Shared utility components
│   │   ├── pages/               # Main application pages
│   │   ├── hooks/               # Custom React hooks
│   │   ├── context/             # React context providers
│   │   ├── types/               # TypeScript definitions
│   │   ├── utils/               # Frontend utilities
│   │   └── __tests__/           # Frontend test suite
│   ├── package.json             # Node.js dependencies
│   └── tsconfig.json            # TypeScript configuration
├── docs/                        # Documentation and screenshots
├── docker-compose.yml           # Development containers
├── docker-compose.prod.yml      # Production containers
├── CLAUDE.md                    # Development guide
└── README.md                    # Project documentation
```

## 📈 Future Enhancements

### Short-term (Next Quarter)
- [ ] Mobile app (React Native)
- [ ] Advanced recommendation explanations
- [ ] Real-time chat system
- [ ] Enhanced notification system
- [ ] API rate limiting improvements

### Medium-term (6 months)
- [ ] Machine learning recommendation improvements
- [ ] Advanced analytics dashboard
- [ ] Content discovery algorithms
- [ ] Social media integration
- [ ] Offline-first functionality

### Long-term (1+ years)
- [ ] AI-powered content analysis
- [ ] Recommendation diversity optimization
- [ ] Advanced community features
- [ ] Multi-language support
- [ ] Enterprise features and API

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- **Backend**: Follow PEP 8, add type hints, include docstrings
- **Frontend**: Use TypeScript strictly, follow React best practices
- **Testing**: Maintain >90% code coverage
- **Documentation**: Update docs for any API or feature changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MyAnimeList** for comprehensive anime and manga data
- **Supabase** for providing an excellent backend-as-a-service platform
- **React and Flask communities** for outstanding documentation and support
- **Open source contributors** who make projects like this possible

## 📧 Contact

**Developer**: Michael Cho  
**Email**: [cho.michael13524@gmail.com](mailto:cho.michael13524@gmail.com)  
**Project Link**: [https://github.com/MichaelCho6556/myProjects](https://github.com/MichaelCho6556/myProjects)

---

⭐ **If you found this project helpful, please give it a star!**

*Built with ❤️ for the anime and manga community*