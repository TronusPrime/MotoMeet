from flask import Flask, render_template, request, session, make_response, redirect, url_for, abort, jsonify
import requests
import os
from psycopg2.extras import RealDictCursor
import psycopg2
import bcrypt
import jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta
from urllib.parse import unquote
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS, cross_origin


app = Flask(__name__)
load_dotenv()
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
SECRET_KEY = os.getenv('JWT_SECRET_KEY')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "https://moto-meet.vercel.app",
    "https://motomeet.xyz",
    "https://www.motomeet.xyz"
])
app.config["SESSION_TYPE"] = "filesystem"  # Store sessions on the server
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)
def config():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database = os.getenv("DB_NAME"),
            user = os.getenv("DB_USER"),
            password = os.getenv("DB_PASSWORD"),
            port = int(os.getenv("DB_PORT", 5432)),
            cursor_factory = RealDictCursor,
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database Connection Error: {e}")
        return None
            

def authenticate(email, password):
    try:
        connection = config()
        if not connection:
            print("Database Connection Error")
            raise Exception
        with connection.cursor() as cur:
            cur.execute("SELECT hashed_password FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            cur.close()
            connection.close()
        stored_hash = user["hashed_password"].encode()  # convert back to bytes
        return bcrypt.checkpw(password.encode(), stored_hash)
    except Exception as e:
        print(f"❌ Database Connection Error: {e}")
        return False

def get_nearby_events(user_lat, user_lon, radius=80467):  # 50 miles in meters
    """Fetch events within a given radius using PostGIS."""
    conn = config()
    cursor = conn.cursor()

    query = """
        SELECT e.host_email, e.event_uuid, e.event_name, e.event_time, e.location,
               e.latitude, e.longitude, e.description,
               u.n AS host_name,
               COUNT(r.user_email) AS rsvp_count,
               ST_DistanceSphere(e.geom::geometry, ST_MakePoint(%s, %s)::geometry) AS distance
        FROM events e
        JOIN users u ON e.host_email = u.email
        LEFT JOIN rsvps r ON e.event_uuid = r.event_id
        WHERE ST_DistanceSphere(e.geom::geometry, ST_MakePoint(%s, %s)::geometry) <= %s
        GROUP BY e.event_uuid, u.n
        ORDER BY e.event_time ASC;
    """

    cursor.execute(query, (user_lon, user_lat, user_lon, user_lat, radius))
    events = cursor.fetchall()
    cursor.close()
    conn.close()

    return events

#TODO: See if i need to remove this
@app.route('/')
def main_page():
    return jsonify({"status": "MotoMeet backend is running!"})

@app.route('/test_db')
def test_db():
    try:
        conn = config()
        if not conn:
            return "❌ Database connection failed"

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT 1")  # Simple test query
            result = cur.fetchone()
        
        conn.close()
        return f"✅ Database connection successful: {result}"

    except Exception as e:
        return f"❌ Database Connection Error: {e}"


@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    n = data.get("name")
    make = data.get("make")
    model = data.get("model")
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email is required"}), 400
    pwd = data.get("pwd")
    if not pwd or len(pwd) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if len(n) > 50 or len(make) > 50 or len(model) > 20:
        return jsonify({"error": "Fields too long"}), 400

    print(email)
    print(model)
    try:
        conn = config()
        if not conn:
            print("❌ Database connection failed")
            return jsonify({"error": "Database connection failed"}), 500

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # ✅ Check if the user already exists
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            email_check = cur.fetchone()
            if email_check:
                print("❌ User already exists")
                return jsonify({"error": "User already exists. Please log in."}), 400

            # ✅ Hash password and store as string
            hashed_password = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

            # ✅ Insert user into database
            cur.execute(
                "INSERT INTO users (email, hashed_password, make, model, made_events, n) VALUES (%s, %s, %s, %s, %s, %s)",
                (email, hashed_password, make, model, '{}', n)
            )
            conn.commit()

        # ✅ Issue JWT token
        token = jwt.encode(
            {
                "email": email,
                "exp": datetime.utcnow() + timedelta(hours=5)  # expires in 1 day
            },
            SECRET_KEY,
            algorithm="HS256"
        )

        resp = make_response(jsonify({
            "message": "User created successfully",
            "email": email
        }))
        resp.set_cookie(
            "access_token", token,
            httponly=True,
            secure=True,
            samesite="None",
            max_age=60*60  # 1 hour
        )
        return resp


    except Exception as e:
        print(f"❌ Error during signup: {e}")
        return jsonify({"error": "Internal Server Error"}), 500



@app.route('/api/set_location', methods=['GET', 'POST'])
def set_location():
    data = request.get_json()
    city = data.get("city")
    radius = data.get("radius")

    if not city or not radius:
        return jsonify({"error": "Please enter a valid city and radius."}), 400

        # Call Google Geocoding API
    params = {
        "address": city,
        "key": GOOGLE_MAPS_API_KEY
    }

    try:
        response = requests.get(GOOGLE_GEOCODE_URL, params=params)

        # Check if request was successful
        if response.status_code != 200:
            return jsonify({"error": "Geocoding API error"}), 500
            # Parse JSON response
        data = response.json()

        # Ensure we got a valid result
        if "results" not in data or not data["results"]:
            return jsonify({"error": "City not found."}), 404

            # Extract latitude & longitude from response
        location = data["results"][0]["geometry"]["location"]
        user_lat = float(location["lat"])
        user_lon = float(location["lng"])
        user_radius = int(radius) * 1609  # Convert miles to meters
        user_email = get_email_from_token()


        conn = config()
        if not conn:
            return jsonify({"error": "Database Connection Error"}), 500
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if the user already has a location
            cur.execute("SELECT * FROM users WHERE email = %s", (user_email,))
            user_exists = cur.fetchone()

            if user_exists:
                # Update existing location data
                cur.execute("""
                    UPDATE users
                    SET lat = %s, long = %s, radius = %s, city = %s
                    WHERE email = %s
                """, (user_lat, user_lon, user_radius, city, user_email))
            else:
                # Insert new location data
                cur.execute("""
                    INSERT INTO users (email, lat, long, radius, city)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user_email, user_lat, user_lon, user_radius, city))

            conn.commit()
        conn.close()

            # Redirect to home page after updating location
        return jsonify({"message": "Location updated successfully!"}), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Request Error: {str(e)}"}), 500

@app.route('/api/autocomplete', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["http://localhost:5173","https://moto-meet.vercel.app", "https://motomeet.xyz", "https://www.motomeet.xyz"], supports_credentials=True)
@limiter.limit("30 per minute")
def autocomplete_proxy():
    data = request.get_json()
    response = requests.post(
        "https://places.googleapis.com/v1/places:autocomplete",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "suggestions.placePrediction.text"
        },
        json=data
    )
    return jsonify(response.json())
@app.route('/api/geocode', methods=['POST'])
@cross_origin(origins=["http://localhost:5173","https://moto-meet.vercel.app", "https://www.motomeet.xyz"], supports_credentials=True)
def geocode():
    data = request.get_json()
    address = data.get("address")
    if not address:
        return jsonify({"error": "No address provided"}), 400

    params = {
        "address": address,
        "key": GOOGLE_MAPS_API_KEY
    }

    try:
        response = requests.get(GOOGLE_GEOCODE_URL, params=params)
        results = response.json().get("results")
        if not results:
            return jsonify({"error": "No results found"}), 404

        location = results[0]["geometry"]["location"]
        return jsonify({
            "lat": location["lat"],
            "lng": location["lng"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_email_from_token():
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["email"]
    except Exception as e:
        print("JWT error:", e)
        return None
#Handles log ins
@app.route('/api/login', methods=['POST'])
def login():
    print("WOW")
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email is required"}), 400
    pwd = data.get("pwd")
    print("C")
    if authenticate(email, pwd):
        token = jwt.encode({"email": email, "exp": datetime.utcnow() + timedelta(hours=5)  # expires in 1 day
        }, SECRET_KEY, algorithm="HS256")
        print("WOW")
        resp = make_response(jsonify({"message":"User Authenticated!"}))
        resp.set_cookie(
            "access_token", token,
            httponly=True,
            secure = True,
            samesite = "None",
            max_age=60*60
        )
        return resp
@app.route('/api/home', methods=['GET', 'POST'])
@cross_origin(origins=["http://localhost:5173","https://moto-meet.vercel.app", "https://motomeet.xyz", "https://www.motomeet.xyz"], supports_credentials=True)
def events():
    print("Check 1")
    # POST = RSVP or unRSVP
    if request.method == "POST":
        data = request.get_json()
        rsvp_id = data.get("event_id")
        state = data.get("state")
        email = get_email_from_token()
        if not email:
            return jsonify({"error": "Email is required"}), 400
        if email is None:
            email = get_email_from_token()
        if email is None:
            print("email is none error")
        print("PC2")
        try:
            connection = config()
            if not connection:
                print("PC3")
                raise Exception("Database Connection Error")
            
            with connection.cursor() as cur:
                print(state)
                if state:
                    print("PC3")
                    print("email:", email)
                    print("rsvp_id:", rsvp_id)
                    cur.execute("""
                        INSERT INTO rsvps (user_email, event_id)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING;
                    """, (email, rsvp_id))
                    print("PC4")
                else:
                    cur.execute("""
                        DELETE FROM rsvps
                        WHERE user_email = %s AND event_id = %s;
                    """, (email, rsvp_id))
                print("PC5")
                cur.execute("SELECT COUNT(*) FROM rsvps WHERE event_id = %s", (rsvp_id,))
                print("PC6")
                count = cur.fetchone()["count"]
                print(count)
                connection.commit()
                cur.close()
            connection.close()

        except Exception as e:
            return jsonify({'error': f"❌ Database Error: {str(e)}"}), 500
        print(count)
        return jsonify({'message': 'RSVP updated successfully!', 'rsvp_count': count})
    print("C2")
    # GET = Render events page
    try:
        print("✅ Hit /api/home")
        email = get_email_from_token()
        print("✅ Decoded email:", email)
        if not email:
            return jsonify({"error": "Unauthorized"}), 401
        connection = config()
        print("C3")
        if not connection:
            print("misery")
            raise Exception("Database Connection Error")
        print("C3.5")
        with connection.cursor() as cur:
            # User info
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            data = cur.fetchone()
            print("c4")
            # Events this user is going to
            cur.execute("SELECT event_id FROM rsvps WHERE user_email = %s", (email,))
            print("C5")
            rsvp_rows = cur.fetchall()
            print("C6")
            print(rsvp_rows)
            print([row["event_id"] for row in rsvp_rows])
            events_going = [row["event_id"] for row in rsvp_rows]
            print("C7")
            connection.commit()
            cur.close()
        connection.close()

    except Exception as e:
        return jsonify({'error': f"❌ Database Error: {str(e)}"}), 500

    # Store user info in session
    name = data.get("n")
    made = data.get("made_events")
    make = data.get("make")
    model = data.get("model")

    # Location
    user_lat = data.get('lat')
    user_lon = data.get('long')
    radius = data.get('radius', 80467)  # default 50 miles
    city = data.get('city')

    if not user_lat or not user_lon:
        return jsonify({'error': "User Location not found"}), 404

    # Nearby events
    nearby_events = get_nearby_events(user_lat, user_lon, radius)

    return jsonify({
        "n": name,
        "email": email,
        "events": nearby_events,
        "city": city,
        "radius": int(radius / 1609),
        "lat": user_lat,
        "long": user_lon,
        "events_going": events_going,
    })



@app.route('/api/profile', methods=['GET','POST'])
@cross_origin(origins=["http://localhost:5173","https://moto-meet.vercel.app", "https://www.motomeet.xyz"], supports_credentials=True)
def user_profile():
    print("C1")
    email = get_email_from_token()
    print(email)
    try:
        print("C2")
        connection = config()
        with connection.cursor() as cur:
            print("C3")
            cur.execute("""
                SELECT e.*, u.n AS host_name
                FROM events e
                JOIN users u ON e.host_email = u.email
                WHERE e.event_uuid = ANY (
                    SELECT event_id FROM rsvps WHERE user_email = %s
                )
            """, (email,))
            events_going = cur.fetchall()  # <-- ✅ This line is the fix
            print("C4")
            cur.execute("SELECT make, model, n, city, radius, made_events FROM users WHERE email = %s", (email,))
            data = cur.fetchone()
            print("C5")
        cur.close()
        connection.close()
    except Exception as e:
        return jsonify({'error': "User Profile not found"}), 404
    print(events_going)
    
    return jsonify({
        "name": data["n"],
        "email": email,
        "events":events_going,
        "city": data["city"],
        "radius": int(data["radius"] / 1609),
        "make": data["make"],
        "model": data["model"]
    })
@app.route('/api/verify', methods=['GET'])
@cross_origin(origins=["http://localhost:5173","https://moto-meet.vercel.app", "https://www.motomeet.xyz"], supports_credentials=True)
def verify_session():
    email = get_email_from_token()
    if email:
        return jsonify({"message": "Authenticated"}), 200
    return jsonify({"error": "Unauthorized"}), 401

@app.route('/api/create_event', methods=['POST'])
@cross_origin(origins=["http://localhost:5173","https://moto-meet.vercel.app", "https://www.motomeet.xyz"], supports_credentials=True)
@limiter.limit("3 per minute")
def create_event():
    data = request.get_json()
    new_event_name = data.get("event_name")
    if len(new_event_name.strip()) == 0 or len(new_event_name) > 50:
        return jsonify({"error": "Invalid Event Name"}), 400
    new_event_time = data.get("event_time")
    event_loc = data.get("location")
    new_event_loc = unquote(event_loc)
    try:
        new_event_lat = float(data.get("lat"))
        new_event_long = float(data.get("lng"))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid Coordinates"}), 400
    new_event_description = data.get("description")
    
    print(f"PLEASE {new_event_long}")
    print(f'{new_event_name} {new_event_time} {new_event_loc} {new_event_lat} {new_event_long}')
    email = get_email_from_token()
    if not email:
        return jsonify({"error": "Unauthorized"}), 401
    # We need to update the users and events table accordingly
    conn = config()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO events (event_name, event_time, location, latitude, longitude, host_email, description)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    RETURNING event_uuid
    """, (new_event_name, new_event_time, new_event_loc, new_event_lat, new_event_long, email, new_event_description))

    new_event_uuid = cursor.fetchone()["event_uuid"]
    cursor.execute("""
        UPDATE users
        SET made_events = array_append(made_events, %s)
        WHERE email = %s
    """, (new_event_uuid, email))
    cursor.execute("""
        INSERT INTO rsvps (user_email, event_id)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING;
    """, (email, new_event_uuid))
    conn.commit()
    # Then, the events should show!
    cursor.close()
    conn.close()
    print(new_event_uuid)
    return jsonify({"message": "Event created successfully!", "event_id": new_event_uuid}), 200

@app.route("/api/news", methods=["GET"])
def news():
    updates = [
        {
            "title": "MotoMeet V1.0 Launch",
            "date": "2025-04-02",
            "content": (
                "Hello everyone! This is the beta release of MotoMeet, a platform for bikers "
                "to schedule and find group meets and rides. I made this after having so much trouble "
                "finding any meets after moving back home from university! So far, users can create and RSVP "
                "to events! I'm going to release new features in the coming weeks, so stay tuned! - Sam"
            )
        }
    ]
    return jsonify(updates), 200

@app.route('/api/update_event', methods=['POST'])
def update_event():
    data = request.get_json()

    event_id = data.get("event_id")
    name = data.get("event_name")
    time = data.get("event_time")
    location = unquote(data.get("location"))
    lat = float(data.get("lat"))
    lng = float(data.get("lng"))
    description = data.get("description", "")
    
    conn = config()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE events
        SET event_name = %s, event_time = %s, location = %s, latitude = %s, longitude = %s, description = %s
        WHERE event_uuid = %s
    """, (name, time, location, lat, lng, description, event_id))

    conn.commit()
    cursor.close()
    conn.close()
    return jsonify(message="Event updated!")

#TODO: Once an event has been cancelled or edited, send an alert email to everyone rsvped

@app.route('/api/logout', methods=["POST"])
def logout():
    resp = make_response(jsonify({"message": "Logged out"}))
    resp.set_cookie(
        "access_token", "",      # Remove the token
        httponly=True,
        secure=True,
        samesite="None",
        max_age=0                # Expire immediately
    )
    return resp


@app.route('/api/cancel_event', methods=["POST"])
def cancel_event():
    print("ow")
    data = request.get_json()
    cancelled_event_id = data.get("event_id")
    print(cancelled_event_id)
    if not cancelled_event_id:
        return jsonify({"error": "Missing event_id"}), 400

    conn = config()
    cursor = conn.cursor()

    try:
        # Remove RSVPs
        print("cancel Event check 3")
        cursor.execute("DELETE FROM rsvps WHERE event_id = %s", (cancelled_event_id,))

        # Delete the event itself
        cursor.execute("DELETE FROM events WHERE event_uuid = %s", (cancelled_event_id,))

        # Clean up made_events array in users table
        cursor.execute("""
            UPDATE users
            SET made_events = (
                SELECT ARRAY_AGG(eid)
                FROM unnest(made_events) AS eid
                WHERE eid IN (SELECT event_uuid FROM events)
            );
        """)

        conn.commit()
        return jsonify({"message": "Event canceled successfully!"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run()