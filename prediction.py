from pymongo import MongoClient
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# Connect to MongoDB
client = MongoClient('localhost', 27017)  # Assuming MongoDB is running locally on default port

# Select database and collection
db = client['stockeye_database']
collection = db['objects']

# Convert MongoDB collection to DataFrame
cursor = collection.find({})
db = pd.DataFrame(list(cursor))

# Close MongoDB connection
client.close()

# Perform data preprocessing and visualization as before
# For example:

# Convert 'Date' column to datetime
db['Date'] = pd.to_datetime(db['Date'])

# Extract month from 'Date'
db['Month'] = db['Date'].dt.month

# Visualization
plt.figure(figsize=(10, 6))
sns.countplot(x="Gender", data=db)
plt.title("Distribution of Gender")
plt.show()

plt.figure(figsize=(10, 6))
sns.lineplot(x='Month', y='Total', data=db)
plt.title("Total Sales Trend Over Months")
plt.show()

# Similarly, you can perform other visualizations and calculations
