<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>42 School Profile</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }

        body {
            background: url('https://yourimageurl.com/bg.jpg') no-repeat center center fixed;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .profile-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            width: 350px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease-in-out;
        }

        .profile-card:hover {
            transform: scale(1.05);
        }

        .profile-card img {
            width: 100%;
            border-radius: 10px;
            margin-bottom: 15px;
        }

        .profile-card h2 {
            color: white;
            font-size: 22px;
        }

        .profile-card p {
            color: #ddd;
            font-size: 14px;
            margin-top: 5px;
        }

        .profile-card a {
            display: inline-block;
            margin-top: 15px;
            padding: 10px 20px;
            text-decoration: none;
            font-weight: bold;
            color: white;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            transition: background 0.3s ease-in-out;
        }

        .profile-card a:hover {
            background: rgba(255, 255, 255, 0.4);
        }
    </style>
</head>
<body>

    <div class="profile-card">
        <a href="https://profile.intra.42.fr/users/akella" target="_blank">
            <img src="https://badge.mediaplus.ma/red/akella" alt="42 Intra Profile: Amine Kella">
        </a>
        <h2>📍 Student at 42 School</h2>
        <p>Low-Level Programming & Cybersecurity</p>
        <a href="https://profile.intra.42.fr/users/akella" target="_blank">View My 42 Profile</a>
    </div>

</body>
</html>
