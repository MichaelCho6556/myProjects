# League of Legends Win Predictor

This project aims to predict the outcome of League of Legends matches by analyzing in-game statistics using machine learning algorithms. The primary focus is on building and optimizing Logistic Regression
and K-Nearest Neighbors (KNN) models to achieve high prediction accuracy.

## Dataset
The dataset used in this project is from https://www.kaggle.com/datasets/bobbyscience/league-of-legends-diamond-ranked-games-10-min,
which includes early-game statistics from high-ranking matches. Each row represents a game with various features for both blue and red teams.

## Feature Selection
Feature selection was performed using Recursive Feature Elimination (RFE) with Logistic Regression as the estimator and selected the most significant features that contribute to predicting the game outcome.

## Modeling
Two machine learning models were trained and evaluated:
- Logistic Regression
- K-Nearest Neighbors (KNN)

### Logistic Regression
Logistic Regression was used to model the probability of the blue team winning based on the selected features.

#### Hyperparameter Tuning:
Grid search is performed over teh following parameter grid:
```
logreg_param_grid = {
    'C': [0.01, 0.1, 1, 10, 100],        # Regularization strength
    'solver': ['liblinear', 'lbfgs'],    # Solvers for logistic regression
}
```
#### Best parameter:
```
Best parameters for Logistic Regression: {'C': 0.01, 'solver': 'lbfgs'}
```

#### K-Nearest Neighbors
KNN was employed as a non-parametric method to classify the game outcome based on the proximity of feature values

#### Hyperparameter Tuning:
Grid search was performed over the following parameter grid:
```
knn_param_grid = {
    'n_neighbors': [3, 5, 7, 9],               # Number of neighbors
    'weights': ['uniform', 'distance'],        # Weighting method
    'metric': ['euclidean', 'manhattan']       # Distance metrics
}
```
#### Best parameter:
```
Best parameters for KNN: {'metric': 'euclidean', 'n_neighbors': 9, 'weights': 'uniform'}
```
## Results
The models were evaluated using 5-fold cross validation to ensure robustness.
```
Logistic Regression Cross-Validation Accuracy: 73.29%
KNN Cross-Validation Accuracy: 70.94%
```
### Classification Report for Logistic Regression:
```
Classification Report for Logistic Regression:
              precision    recall  f1-score   support

          0       0.73      0.74      0.73      1480
          1       0.74      0.73      0.73      1484

accuracy                           0.73      2964
macro avg       0.73      0.73      0.73      2964
weighted avg    0.73      0.73      0.73      2964
```

## Conclusion
The project successfully builds a predictive model to determine the outcome of League of Legends matches using game statistics. Logistic Regression achieved an accuracy of 73.29%, outperforming KNN, which achieved 70.94%. The models were optimized through hyperparameter tuning and validated using cross-validation techniques.
