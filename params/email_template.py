def get_html_template(name, FORM_LINK):
    return f"""
    <html>
        <body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
            <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
                <img src='cid:bannerimage' alt='Havells mYOUsic Banner' style='width:100%; display:block;'>
                <div style='padding:32px;'>
                    <h2 style='color:#ff0000; text-align:center;'>Turn Up the Volume on Your Dreams</h2>
                    <p style='text-align:center; font-size:1.1em;'>Is your music living in a diary, waiting for its moment? 🎶</p>
                    <p>Dear <b>{name}</b>,</p>
                    <p>Have you ever felt that your <span style='color:#ff0000; font-weight:bold;'>original music</span> deserves to be heard by the world?</p>
                    <p>We understand that every <span style='color:#ff0000; font-weight:bold;'>authentic voice</span> needs the right stage to shine. That's why <b>Havells</b> are excited to introduce <b>mYOUsic</b> - a creative space where passionate artists can bring their <span style='color:#ff0000; font-weight:bold;'>original music</span> to life.</p>
                    <p>This isn't another competition - it's your chance to be part of something special. We're creating a <b>learning and collaborative environment</b> where you'll:</p>
                    <ul style='padding-left:20px;'>
                        <li><b>Unfold Your Unique Voice:</b> Join a supportive community where your artistic identity and <span style='color:#ff0000; font-weight:bold;'>original sound</span> can truly flourish.</li>
                        <li><b>Learn from Industry Masters:</b> Get personal guidance from accomplished mentors who are passionate about helping you grow.</li>
                        <li><b>Create Professional Music:</b> Experience the magic of bringing your songs to life in a professional studio.</li>
                        <li><b>Grow Together:</b> Be part of a creative journey where every artist supports and inspires each other.</li>
                    </ul>
                    <p>Whether you're a <span style='color:#ff0000; font-weight:bold;'>Composer</span>, <span style='color:#ff0000; font-weight:bold;'>Singer</span>, <span style='color:#ff0000; font-weight:bold;'>Writer</span>, <span style='color:#ff0000; font-weight:bold;'>Music Producer</span>, or part of a <span style='color:#ff0000; font-weight:bold;'>Band ( Original songs only)</span> - there's a place for you here. If you know someone whose original music deserves to be heard, invite them to join us too!</p>
                    <div style='text-align:center; margin:40px 0;'>
                        <a href='{FORM_LINK}' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.3em; font-weight:bold; display:inline-block;'>Begin Your Journey Here</a>
                    </div>
                    <p style='text-align:center; font-size:0.9em; color:#666; margin-top:15px;'>Submissions will only be accepted through the above link (google form) and submit your original work to be reviewed</p>
                </div>
            </div>
        </body>
    </html>
    """