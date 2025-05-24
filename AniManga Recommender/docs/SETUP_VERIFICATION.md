# Setup Verification Guide

Use this guide to verify that your AniManga Recommender setup is working correctly.

## ✅ Pre-Setup Checklist

Before running the application, ensure you have:

- [ ] **Node.js 16+** installed (`node --version`)
- [ ] **npm** installed (`npm --version`)
- [ ] **Python 3.10+** installed (`python --version`)
- [ ] **pip** installed (`pip --version`)
- [ ] **Docker** (optional, `docker --version`)

## 🔍 Local Development Verification

### Backend Verification

1. **Dependencies Installation**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

   ✅ Should complete without errors

2. **Flask Application Start**

   ```bash
   python app.py
   ```

   ✅ Should show: `Running on http://127.0.0.1:5000`

3. **API Endpoint Test**
   ```bash
   # In a new terminal
   curl http://localhost:5000/api/distinct-values
   ```
   ✅ Should return JSON with media_types, genres, etc.

### Frontend Verification

1. **Dependencies Installation**

   ```bash
   cd frontend
   npm install
   ```

   ✅ Should complete without errors

2. **TypeScript Compilation**

   ```bash
   npm run build
   ```

   ✅ Should complete with "Compiled successfully"

3. **Development Server Start**
   ```bash
   npm start
   ```
   ✅ Should open browser to `http://localhost:3000`

## 🐳 Docker Verification

1. **Build and Start Services**

   ```bash
   docker-compose up --build
   ```

   ✅ Both services should start successfully

2. **Container Health Check**

   ```bash
   docker-compose ps
   ```

   ✅ Both containers should show "Up" status

3. **Service Accessibility**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000/api/items`

## 🧪 Functionality Tests

### Homepage Tests

- [ ] Page loads without errors
- [ ] Item cards display with images
- [ ] Search functionality works
- [ ] Filters can be applied
- [ ] Pagination works

### Item Detail Tests

- [ ] Clicking an item card navigates to detail page
- [ ] Item information displays correctly
- [ ] Recommendations load at bottom
- [ ] Back navigation works

### API Tests

- [ ] `/api/items` returns paginated results
- [ ] `/api/items/<uid>` returns single item
- [ ] `/api/recommendations/<uid>` returns recommendations
- [ ] `/api/distinct-values` returns filter options

## 🚨 Common Issues & Solutions

### Backend Issues

**Issue**: `ModuleNotFoundError`
**Solution**: Ensure virtual environment is activated and dependencies installed

**Issue**: `Port 5000 already in use`
**Solution**: Kill existing process or change port in `app.py`

**Issue**: `FileNotFoundError` for data files
**Solution**: Ensure data files exist in `backend/data/` directory

### Frontend Issues

**Issue**: `npm install` fails
**Solution**: Delete `node_modules` and `package-lock.json`, then retry

**Issue**: TypeScript compilation errors
**Solution**: Check for type mismatches, run `npm run build` for details

**Issue**: `Cannot connect to backend`
**Solution**: Ensure backend is running on port 5000

### Docker Issues

**Issue**: Docker build fails
**Solution**: Check Dockerfile syntax and ensure base images are available

**Issue**: Port conflicts
**Solution**: Stop existing services or change ports in `docker-compose.yml`

## 📊 Performance Benchmarks

### Expected Load Times

- **Homepage**: < 2 seconds
- **Item Detail**: < 1 second
- **Search Results**: < 3 seconds
- **Recommendations**: < 2 seconds

### Resource Usage

- **Memory**: ~200MB (backend) + ~150MB (frontend)
- **CPU**: Low usage during normal operation
- **Disk**: ~500MB for full setup

## 🎯 Success Criteria

Your setup is successful when:

1. ✅ Both frontend and backend start without errors
2. ✅ Homepage displays anime/manga items with images
3. ✅ Search and filtering functionality works
4. ✅ Item detail pages load with recommendations
5. ✅ No console errors in browser developer tools
6. ✅ API endpoints respond with valid JSON

## 📞 Getting Help

If you encounter issues:

1. Check this verification guide
2. Review error messages carefully
3. Ensure all prerequisites are met
4. Check the main README.md for detailed setup steps
5. Create an issue on the GitHub repository with:
   - Your operating system
   - Node.js and Python versions
   - Complete error messages
   - Steps you've tried
