# 🎌 AniManga Recommender

A full-stack web application that provides personalized anime and manga recommendations using content-based filtering with TF-IDF vectorization and cosine similarity. Built with React TypeScript frontend and Python Flask backend.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.1.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.1.1-green.svg)
![Python](https://img.shields.io/badge/Python-3.10+-green.svg)

## 📸 Screenshots

### Homepage with Advanced Filtering

![Homepage Screenshot](docs/images/homepage.png)
_Advanced search and filtering interface with multi-select dropdowns_

### Item Detail Page

![Item Detail Screenshot](docs/images/item-detail.png)
_Comprehensive item information with personalized recommendations_

### Filtering in Action

![Filtering Demo](docs/images/filtering-demo.gif)
_Real-time filtering and search functionality_

## 🚀 Live Demo

🔗 **[Live Application](https://your-deployment-url.com)** _(Coming Soon)_

## ✨ Features

### 🎯 Core Functionality

- **Intelligent Recommendations**: Content-based filtering using TF-IDF and cosine similarity
- **Advanced Search**: Real-time search across titles, genres, themes, and more
- **Multi-Select Filtering**: Filter by genres, themes, demographics, studios, authors, and status
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Theme UI**: Modern, eye-friendly dark interface

### 🔍 Search & Discovery

- **Smart Search**: Search across titles, descriptions, and metadata
- **Multiple Filter Categories**:
  - Media Type (Anime/Manga)
  - Genres (Action, Romance, Comedy, etc.)
  - Themes (School, Military, Supernatural, etc.)
  - Demographics (Shounen, Seinen, Josei, etc.)
  - Studios (for anime) and Authors (for manga)
  - Status (Airing, Completed, etc.)
  - Minimum Score filtering
  - Year filtering
- **Dynamic Sorting**: Sort by score, popularity, title, or date
- **Pagination**: Efficient browsing with customizable items per page

### 📱 User Experience

- **Item Detail Pages**: Comprehensive information with trailers (for anime)
- **Clickable Tags**: Navigate to filtered results from item details
- **Loading States**: Skeleton screens and spinners for better UX
- **Error Handling**: Graceful error states with retry functionality
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

### 🛠 Technical Features

- **TypeScript**: Full type safety throughout the application
- **RESTful API**: Clean, documented API endpoints
- **Docker Support**: Containerized deployment
- **Field Mapping**: Seamless data compatibility between backend and frontend
- **Error Boundaries**: React error boundaries for crash prevention

## 🏗 Tech Stack

### Frontend

- **React 19.1.0** - UI framework
- **TypeScript 5.8.3** - Type safety and developer experience
- **React Router DOM 7.6.0** - Client-side routing
- **Axios 1.9.0** - HTTP client for API communication
- **React Select 5.10.1** - Advanced multi-select components
- **React Loading Skeleton 3.5.0** - Loading state components

### Backend

- **Python 3.10+** - Core programming language
- **Flask 3.1.1** - Web framework
- **Flask-CORS 5.0.1** - Cross-origin resource sharing
- **Pandas 2.2.3** - Data manipulation and analysis
- **Scikit-learn 1.6.1** - Machine learning algorithms
- **NumPy 2.2.5** - Numerical computing

### Development & Deployment

- **Docker & Docker Compose** - Containerization
- **Git** - Version control
- **ESLint** - Code linting
- **Create React App** - React development environment

### Data Sources

- **MyAnimeList (MAL)** - Anime and manga metadata
- **Custom preprocessing pipeline** - Data cleaning and feature engineering

## 🚀 Quick Start

### Prerequisites

- **Node.js 16+** and **npm**
- **Python 3.10+** and **pip**
- **Docker** (optional, for containerized deployment)

### Option 1: Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/MichaelCho6556/myProjects.git
cd animanga-recommender
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
cd animanga-recommender

# Start both services with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

### Verification

1. Open `http://localhost:3000` in your browser
2. You should see the homepage with anime/manga items
3. Try searching and filtering functionality
4. Click on an item to view details and recommendations

## 🔧 Environment Setup

### Required Environment Variables

#### Backend Configuration (.env in /backend directory)

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
```

#### Frontend Configuration (.env in /frontend directory)

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Supabase Setup

1. **Create Account**: Go to [supabase.com](https://supabase.com) and create an account
2. **Create Project**: Click "New Project" and fill in project details
3. **Get Credentials**: Go to Settings > API to find your keys

### Generate Secret Keys

```python
import secrets
print("JWT_SECRET_KEY:", secrets.token_urlsafe(32))
print("SECRET_KEY:", secrets.token_urlsafe(32))
```

## 📊 Data Preprocessing

The application includes comprehensive data preprocessing scripts:

### `explore_data.py`

- **Purpose**: Initial data exploration and analysis
- **Features**:
  - Dataset statistics and structure analysis
  - Missing value identification
  - Data type validation
  - Sample data inspection

### `preprocess_data.py`

- **Purpose**: Clean and prepare data for the recommendation system
- **Features**:
  - Data cleaning and normalization
  - Feature engineering for recommendation algorithms
  - Text preprocessing for TF-IDF vectorization
  - Export processed data for the Flask API

### Running Preprocessing Scripts

```bash
cd backend/scripts

# Explore the dataset
python explore_data.py

# Process and clean the data
python preprocess_data.py
```

## 🚀 API Documentation

### Base Information

**Base URL:** `http://localhost:5000` (development) | `https://your-domain.com` (production)  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`  
**Rate Limiting:** 10 requests/minute per authenticated user

### Authentication

Protected endpoints require JWT token in Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Public Endpoints

#### GET `/`

Health check endpoint

```http
GET /
```

**Response:**

```json
{
  "message": "Hello from AniManga Recommender Backend! Loaded 68598 items.",
  "status": "healthy"
}
```

#### GET `/api/items`

Get paginated anime/manga items with filtering

```http
GET /api/items?page=1&per_page=20&q=attack&genre=action&min_score=8.0
```

**Query Parameters:**

- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 30, max: 50)
- `q` (string): Search query
- `media_type` (string): "anime" or "manga"
- `genre` (string): Comma-separated genres
- `min_score` (float): Minimum score (0-10)
- `year` (int): Release year

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
      "episodes": 25
    }
  ],
  "total_items": 1205,
  "total_pages": 61,
  "current_page": 1
}
```

#### GET `/api/items/<uid>`

Get detailed item information

```http
GET /api/items/anime_16498
```

#### GET `/api/recommendations/<uid>`

Get content-based recommendations

```http
GET /api/recommendations/anime_16498?n=10
```

### Protected Endpoints

#### GET `/api/auth/dashboard`

Get user dashboard data

```http
GET /api/auth/dashboard
Authorization: Bearer <token>
```

**Response:**

```json
{
  "user_stats": {
    "total_anime_watched": 142,
    "total_manga_read": 58,
    "average_score": 7.8
  },
  "recent_activity": [
    {
      "type": "completed",
      "item_title": "Attack on Titan",
      "timestamp": "2024-01-15T08:30:00Z"
    }
  ],
  "in_progress": [],
  "plan_to_watch": []
}
```

#### GET `/api/auth/user-items`

Get user's anime/manga list

```http
GET /api/auth/user-items?status=watching
Authorization: Bearer <token>
```

#### POST `/api/auth/user-items/<uid>`

Add/update item in user's list

```http
POST /api/auth/user-items/anime_16498
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "rating": 9,
  "progress": 25
}
```

### Error Responses

All errors return consistent format:

```json
{
  "error": "Error message",
  "status": 400
}
```

**Status Codes:**

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Server Error

## 🤖 Recommendation Algorithm

The recommendation system uses **content-based filtering** with the following approach:

1. **TF-IDF Vectorization**: Convert text features (genres, themes, synopsis) into numerical vectors
2. **Cosine Similarity**: Calculate similarity scores between items
3. **Feature Weighting**: Combine multiple features (genres, themes, demographics, etc.)
4. **Score Filtering**: Filter recommendations by minimum score thresholds
5. **Ranking**: Sort by similarity score and popularity metrics

### Key Features Used:

- Genres and themes
- Demographics
- Synopsis text
- Studios/authors
- User ratings and popularity

## 🔧 Troubleshooting

### Quick Diagnostics

```bash
# Backend health check
curl http://localhost:5000/

# Frontend check
curl http://localhost:3000/

# Database connection test (from backend directory)
python -c "from supabase_client import SupabaseClient; client = SupabaseClient(); print('✅ Database connected successfully')"
```

### Common Issues & Solutions

#### Environment Variables Not Found

```
ValueError: SUPABASE_URL and SUPABASE_KEY must be set in .env
```

**Solutions:**

1. Create `.env` files in both `backend/` and `frontend/` directories
2. Check file location and proper formatting
3. Restart servers after creating .env files

#### Python Dependencies Issues

```
ModuleNotFoundError: No module named 'flask'
```

**Solutions:**

1. Activate virtual environment: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (macOS/Linux)
2. Install dependencies: `pip install -r requirements.txt`
3. Verify Python version: `python --version` (requires 3.10+)

#### Backend Not Starting

```
Port 5000 is already in use
```

**Solutions:**

1. Kill existing process: `netstat -ano | findstr :5000` then `taskkill /F /PID <PID>`
2. Use different port: `set FLASK_RUN_PORT=5001` and update frontend .env
3. Check firewall settings

#### Authentication Issues

```
Error: No valid session token
```

**Solutions:**

1. Sign out and sign in again to refresh token
2. Clear browser storage: `localStorage.clear(); sessionStorage.clear();`
3. Verify Supabase configuration matches between frontend and backend

#### Performance Issues

**Slow Data Loading:**

- Check data size (large datasets require patience on first load)
- Monitor memory usage (4GB+ RAM recommended)
- Use pagination to reduce load

**High Memory Usage:**

- Reduce batch sizes in data loading
- Clear browser cache and reload
- Restart backend server to clear memory

### Rate Limiting

- 10 requests per minute per authenticated user
- Wait 60 seconds before making new requests if exceeded
- Rate limit headers included in responses

## 📁 Project Structure

```
animanga-recommender/
├── backend/
│   ├── data/                    # Processed datasets
│   ├── scripts/
│   │   ├── explore_data.py      # Data exploration
│   │   └── preprocess_data.py   # Data preprocessing
│   ├── venv/                    # Python virtual environment
│   ├── app.py                   # Flask application
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend container
├── frontend/
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Utility functions
│   │   └── hooks/               # Custom React hooks
│   ├── build/                   # Production build output
│   ├── node_modules/            # Node.js dependencies
│   ├── package.json             # Node.js dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── Dockerfile               # Frontend container
├── docs/
│   └── images/                  # Screenshots and documentation images
├── docker-compose.yml           # Multi-container setup
├── LICENSE                      # MIT license file
├── TYPESCRIPT_MIGRATION.md      # TypeScript migration documentation
├── .gitignore                   # Git ignore rules
└── README.md                    # Project documentation
```

## 🧪 Testing

### Frontend Testing

```bash
cd frontend
npm test
```

### Backend Testing

```bash
cd backend
python -m pytest  # (if tests are added)
```

## 🚀 Deployment

### Environment Variables

Create `.env` files for production deployment:

**Backend `.env**:\*\*

```
FLASK_ENV=production
API_BASE_URL=https://your-api-domain.com
```

**Frontend `.env**:\*\*

```
REACT_APP_API_BASE_URL=https://your-api-domain.com
```

### Production Build

```bash
# Frontend production build
cd frontend
npm run build

# Backend production setup
cd backend
pip install -r requirements.txt
gunicorn app:app
```

### Deployment Platforms

**Vercel (Frontend):**

```bash
# Environment variables in Vercel dashboard
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

**Heroku (Backend):**

```bash
# Set via Heroku CLI
heroku config:set SUPABASE_URL=https://your-project-id.supabase.co
heroku config:set SUPABASE_KEY=your_anon_key_here
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📈 Future Enhancements

- [ ] User authentication and personalized profiles
- [ ] Collaborative filtering recommendations
- [ ] Watchlist/reading list functionality
- [ ] Rating and review system
- [ ] Advanced recommendation explanations
- [ ] Social features (sharing, comments)
- [ ] Mobile app version
- [ ] Real-time data updates from MAL API

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **MyAnimeList** for providing comprehensive anime and manga data
- **React community** for excellent documentation and resources
- **Flask community** for the lightweight and flexible web framework
- **Scikit-learn** for powerful machine learning algorithms

## 📧 Contact

**Developer** - [Michael Cho](mailto:cho.michael13524@gmail.com)

**Project Link**: [https://github.com/MichaelCho6556/myProjects.git](https://github.com/MichaelCho6556/myProjects.git)

---

⭐ If you found this project helpful, please give it a star!
