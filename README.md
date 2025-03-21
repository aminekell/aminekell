def generate_42_profile_card(username, name, image_url):
    return f"""
    <div align="center" style="
        background: url('{image_url}') no-repeat center center; 
        background-size: cover; 
        padding: 20px; 
        border-radius: 10px; 
        width: 80%; 
        margin: auto;
        box-shadow: 0px 0px 10px rgba(255, 255, 255, 0.2);
    ">

      <a href="https://profile.intra.42.fr/users/{username}" target="_blank">
        <img src="https://badge.mediaplus.ma/red/{username}" alt="42 Intra Profile: {name}" style="border-radius: 8px;"/>
      </a>

      <p style="color: white; font-size: 16px; font-weight: bold; margin-top: 10px;">
        📍 Student at 42 School | Low-Level Programming & Cybersecurity
      </p>

      <p style="color: #ddd; font-size: 14px;"><em>Click the badge to view my official 42 intra profile</em></p>

    </div>
    """

html_code = generate_42_profile_card("akella", "Amine Kella", "https://yourimageurl.com/bg.jpg")
print(html_code)
