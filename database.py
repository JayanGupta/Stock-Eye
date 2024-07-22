from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('localhost', 27017)  # Assuming MongoDB is running locally on default port

# Select or create database
db = client['stockeye_database']

# Select or create collection (similar to a table in SQL)
collection = db['objects']

# Function to add object to the collection
def add_object(image_id, filename, timestamp, class_label, confidence, bounding_box):
    # Insert object into the collection
    collection.insert_one({
        'image_id': image_id,
        'filename': filename,
        'timestamp': timestamp,
        'class_label': class_label,
        'confidence': confidence,
        'bounding_box': bounding_box
    })

# Close connection
def close_connection():
    client.close()
