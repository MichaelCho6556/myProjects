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

## 🔌 API Endpoints

### Core Endpoints

#### `GET /api/items`

Retrieve paginated list of anime/manga items with filtering and search.

**Query Parameters:**

- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 30)
- `q` (string): Search query
- `media_type` (string): "anime" or "manga"
- `genre` (string): Genre filter
- `theme` (string): Theme filter
- `demographic` (string): Demographic filter
- `studio` (string): Studio filter (anime only)
- `author` (string): Author filter (manga only)
- `status` (string): Status filter
- `min_score` (float): Minimum score filter
- `year` (int): Year filter
- `sort_by` (string): Sorting option

**Response:**

```json
{
  "items": [...],
  "total_items": 1500,
  "total_pages": 50,
  "current_page": 1,
  "items_per_page": 30
}
```

#### `GET /api/items/<uid>`

Get detailed information for a specific item.

**Response:** Single item object with all metadata.

#### `GET /api/recommendations/<uid>`

Get personalized recommendations for a specific item.

**Query Parameters:**

- `n` (int): Number of recommendations (default: 10)

**Response:**

```json
{
  "recommendations": [...]
}
```

#### `GET /api/distinct-values`

Get all available filter options for the frontend.

**Response:**

```json
{
  "media_types": ["anime", "manga"],
  "genres": [...],
  "themes": [...],
  "demographics": [...],
  "studios": [...],
  "authors": [...],
  "statuses": [...],
  "ratings": [...]
}
```

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

**F** - [Michael Cho](mailto:cho.michael13524@gmail.com)

**Project Link**: [https://github.com/MichaelCho6556/myProjects.git](https://github.com/MichaelCho6556/myProjects.git)

---

⭐ If you found this project helpful, please give it a star!
