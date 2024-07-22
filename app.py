from flask import Flask, render_template
import subprocess
import os


app = Flask(__name__, static_url_path='/static')  

app = Flask(__name__)



@app.route('/')
def index():
    return render_template('encipher.html')
    



if __name__ == '__main__':
    app.run(debug=True)